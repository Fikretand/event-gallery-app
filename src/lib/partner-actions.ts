"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";

import { getRequiredUser } from "@/lib/auth";
import { OFFER_PLACEMENTS, getOffer, isPartnerImageKey, safeOfferLink, type OfferPlacement } from "@/lib/partners";
import { deleteStoredObject, putStoredObject } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { user } = await getRequiredUser();
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Admin client unavailable.");
  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");
  return { admin, actorId: user.id };
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // under the 6 MB server-action body limit
const ZONE = "Europe/Sarajevo";

/**
 * "2026-11-07" as the instant that day starts (or ends) in Sarajevo, so an
 * offer "from the 7th to the 30th" means the admin's days, not UTC's.
 */
function zonedDayBoundary(day: string, end: boolean): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const guess = Date.UTC(y, mo - 1, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0);
  // The zone's offset at that moment, read back from Intl.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(guess - (asUtc - guess)).toISOString();
}

type OfferInput = {
  partner_name: string;
  headline: string;
  body: string | null;
  discount_code: string | null;
  link_url: string | null;
  placements: OfferPlacement[];
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
};

function readOffer(formData: FormData): { value?: OfferInput; error?: string } {
  const text = (name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);
  const partnerName = text("partnerName", 120);
  const headline = text("headline", 160);
  if (!partnerName) return { error: "Partner name is required." };
  if (!headline) return { error: "Headline is required." };

  const rawLink = text("linkUrl", 500);
  const link = safeOfferLink(rawLink);
  if (rawLink && !link) return { error: "The link must start with https://" };

  const placements = formData
    .getAll("placements")
    .map(String)
    .filter((p): p is OfferPlacement => (OFFER_PLACEMENTS as readonly string[]).includes(p));
  if (placements.length === 0) return { error: "Choose at least one page to show the offer on." };

  const startsAt = zonedDayBoundary(text("startsOn", 10), false) ?? new Date().toISOString();
  const endsRaw = text("endsOn", 10);
  const endsAt = endsRaw ? zonedDayBoundary(endsRaw, true) : null;
  if (endsRaw && !endsAt) return { error: "The end date is not valid." };
  if (endsAt && endsAt <= startsAt) return { error: "The end date must be after the start date." };

  return {
    value: {
      partner_name: partnerName,
      headline,
      body: text("body", 600) || null,
      discount_code: text("discountCode", 60) || null,
      link_url: link,
      placements,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: formData.get("isActive") === "on",
      sort_order: Number.parseInt(text("sortOrder", 6), 10) || 0,
    },
  };
}

/** Resize the uploaded picture to a 900 px WebP under partners/<id>/ and return its key. */
async function storeOfferImage(offerId: string, file: File): Promise<{ key?: string; error?: string }> {
  if (!IMAGE_TYPES.includes(file.type)) return { error: "The image must be a JPG, PNG or WebP." };
  if (file.size > IMAGE_MAX_BYTES) return { error: "The image is larger than 5 MB." };
  const webp = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize(900, 900, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const key = `partners/${offerId}/${randomUUID()}.webp`;
  const stored = await putStoredObject(key, webp, "image/webp");
  if (!stored) return { error: "The image could not be stored." };
  return { key };
}

function pickedImage(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createPartnerOfferAction(_state: { error?: string } | undefined, formData: FormData) {
  const { admin, actorId } = await requireAdmin();
  const { value, error } = readOffer(formData);
  if (!value) return { error };

  const id = randomUUID();
  let imageKey: string | null = null;
  const image = pickedImage(formData);
  if (image) {
    const stored = await storeOfferImage(id, image);
    if (!stored.key) return { error: stored.error };
    imageKey = stored.key;
  }

  const { error: insertError } = await admin.from("partner_offers").insert({ id, ...value, image_key: imageKey, created_by: actorId });
  if (insertError) {
    if (imageKey) await deleteStoredObject(imageKey).catch(() => {});
    return { error: insertError.message };
  }
  revalidatePath("/admin/partners");
  redirect("/admin/partners?saved=1");
}

export async function updatePartnerOfferAction(offerId: string, _state: { error?: string } | undefined, formData: FormData) {
  const { admin } = await requireAdmin();
  const existing = await getOffer(offerId);
  if (!existing) return { error: "Offer not found." };
  const { value, error } = readOffer(formData);
  if (!value) return { error };

  let imageKey = existing.image_key;
  const oldKey = isPartnerImageKey(existing.image_key, offerId) ? existing.image_key : null;
  const image = pickedImage(formData);
  if (image) {
    const stored = await storeOfferImage(offerId, image);
    if (!stored.key) return { error: stored.error };
    imageKey = stored.key;
  } else if (formData.get("removeImage") === "on") {
    imageKey = null;
  }

  const { error: updateError } = await admin
    .from("partner_offers")
    .update({ ...value, image_key: imageKey, updated_at: new Date().toISOString() })
    .eq("id", offerId);
  if (updateError) return { error: updateError.message };
  if (oldKey && oldKey !== imageKey) await deleteStoredObject(oldKey).catch(() => {});

  revalidatePath("/admin/partners");
  redirect("/admin/partners?saved=1");
}

export async function setPartnerOfferActiveAction(offerId: string, active: boolean) {
  const { admin } = await requireAdmin();
  const { error } = await admin
    .from("partner_offers")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/partners");
}

export async function deletePartnerOfferAction(offerId: string) {
  const { admin } = await requireAdmin();
  const existing = await getOffer(offerId);
  const { error } = await admin.from("partner_offers").delete().eq("id", offerId);
  if (error) throw new Error(error.message);
  if (existing && isPartnerImageKey(existing.image_key, offerId)) await deleteStoredObject(existing.image_key).catch(() => {});
  revalidatePath("/admin/partners");
}
