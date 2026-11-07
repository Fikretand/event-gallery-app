import { randomInt } from "node:crypto";

import { MAX_OFFERS_PER_PAGE, isPartnerImageKey, type OfferPlacement, type PartnerOffer } from "@/lib/partners-shared";
import { createSignedDownloadUrl } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export * from "@/lib/partners-shared";

/**
 * Partner offers: a partner's discount or service (a bridal salon, a florist,
 * a venue) that the admin places on chosen pages for a chosen period, from
 * /admin/partners. Rows live in public.partner_offers, which only the service
 * role can read (migration round4_partners_and_approval.sql).
 */

function admin() {
  return createSupabaseAdminClient();
}

export async function listAllOffers(): Promise<PartnerOffer[]> {
  const client = admin();
  if (!client) return [];
  const { data, error } = await client
    .from("partner_offers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[partners] list failed", error.message);
    return [];
  }
  return (data ?? []) as PartnerOffer[];
}

export async function getOffer(id: string): Promise<PartnerOffer | null> {
  const client = admin();
  if (!client) return null;
  const { data } = await client.from("partner_offers").select("*").eq("id", id).maybeSingle();
  return (data ?? null) as PartnerOffer | null;
}

export type OfferView = PartnerOffer & { imageUrl: string | null };

/**
 * The offers to show on one page right now, with signed image URLs. A failure
 * here never breaks the page it decorates: it shows no offers instead.
 */
export async function listLiveOffers(placement: OfferPlacement, limit = MAX_OFFERS_PER_PAGE): Promise<OfferView[]> {
  const client = admin();
  if (!client) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from("partner_offers")
    .select("*")
    .eq("is_active", true)
    .contains("placements", [placement])
    .lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[partners] live offers failed", error.message);
    return [];
  }
  const offers = (data ?? []) as PartnerOffer[];
  return Promise.all(
    offers.map(async (offer) => ({
      ...offer,
      imageUrl: isPartnerImageKey(offer.image_key, offer.id) ? await createSignedDownloadUrl(offer.image_key).catch(() => null) : null,
    })),
  );
}

/** Where this visitor's slideshow starts (see rotateOffers). */
export function randomStart(count: number) {
  return count > 1 ? randomInt(count) : 0;
}
