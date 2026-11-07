"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { processMediaById } from "@/lib/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The fixes /admin/support can make for a customer. Each one checks the admin
 * role itself; the page guard is not enough for an action, which can be called
 * on its own.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const { user } = await getRequiredUser();
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Admin client unavailable.");
  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");
  return { admin, actorId: user.id };
}

function assertId(id: string) {
  if (!UUID.test(id)) throw new Error("Invalid id.");
}

function refresh(eventId?: string) {
  revalidatePath("/admin/support");
  if (eventId) revalidatePath(`/admin/support/events/${eventId}`);
}

/**
 * Run processing again for files that failed or got stuck: the attempt
 * counter is reset first, since the nightly job gives up after three. A file
 * that still cannot be read stays "failed"; it is never lost, the original is
 * in R2 either way.
 */
export async function adminRetryProcessingAction(eventId: string, mediaIds?: string[]) {
  const { admin } = await requireAdmin();
  assertId(eventId);
  (mediaIds ?? []).forEach(assertId);

  let query = admin
    .from("media_files")
    .select("id, status, created_at")
    .eq("event_id", eventId)
    .in("status", ["failed", "uploaded", "processing"])
    .is("deleted_at", null)
    .limit(25);
  if (mediaIds?.length) query = query.in("id", mediaIds);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let ok = 0;
  let failed = 0;
  for (const row of data ?? []) {
    await admin.from("media_files").update({ processing_attempts: 0, status: "uploaded" }).eq("id", row.id).eq("event_id", eventId);
    try {
      await processMediaById(row.id);
      ok += 1;
    } catch (cause) {
      failed += 1;
      console.error("[support] reprocess failed", { mediaId: row.id, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  refresh(eventId);
  return { ok, failed, more: (data?.length ?? 0) === 25 };
}

/** Switch guest uploads on or off for an event, e.g. while a problem is fixed. */
export async function adminSetGuestUploadAction(eventId: string, allow: boolean) {
  const { admin } = await requireAdmin();
  assertId(eventId);
  const { error } = await admin.from("event_settings").update({ allow_guest_upload: allow }).eq("event_id", eventId);
  if (error) throw new Error(error.message);
  refresh(eventId);
}

/**
 * Give a gallery more time: the new end is `days` after today or after the
 * current end, whichever is later. This is a goodwill fix (a couple who missed
 * the window), so it is not clamped to the plan's 90 days, and the couple's
 * 30-day upload window is not reopened by it.
 */
export async function adminExtendGalleryAction(eventId: string, days: number) {
  const { admin, actorId } = await requireAdmin();
  assertId(eventId);
  if (![7, 30, 90].includes(days)) throw new Error("Choose 7, 30 or 90 days.");

  const { data: event } = await admin.from("events").select("expires_at").eq("id", eventId).maybeSingle();
  if (!event) throw new Error("Event not found.");
  const base = Math.max(Date.now(), event.expires_at ? new Date(event.expires_at).getTime() : 0);
  const next = new Date(base + days * 86_400_000).toISOString();
  const { error } = await admin.from("events").update({ expires_at: next }).eq("id", eventId);
  if (error) throw new Error(error.message);
  console.info("[support] gallery extended", { eventId, actorId, from: event.expires_at, to: next });
  refresh(eventId);
}

/** Clear the reports on one file once support has looked at it. */
export async function adminDismissReportsAction(eventId: string, mediaId: string) {
  const { admin } = await requireAdmin();
  assertId(eventId);
  assertId(mediaId);
  const { error } = await admin.from("media_reports").delete().eq("event_id", eventId).eq("media_id", mediaId);
  if (error) throw new Error(error.message);
  refresh(eventId);
}

/** Hide a reported file from the gallery (the owner can show it again). */
export async function adminHideMediaAction(eventId: string, mediaId: string) {
  const { admin } = await requireAdmin();
  assertId(eventId);
  assertId(mediaId);
  const { error } = await admin.from("media_files").update({ hidden_at: new Date().toISOString() }).eq("id", mediaId).eq("event_id", eventId);
  if (error) throw new Error(error.message);
  refresh(eventId);
}

/**
 * A one-time password reset link for a customer who cannot sign in and whose
 * reset mail did not arrive. The admin sends it to them by hand. Opening it
 * signs in as that customer, so the admin must not open it themselves.
 */
export async function adminRecoveryLinkAction(targetUserId: string) {
  const { admin, actorId } = await requireAdmin();
  assertId(targetUserId);
  const { data: target } = await admin.from("users").select("email").eq("id", targetUserId).maybeSingle();
  if (!target?.email) throw new Error("User not found.");

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: target.email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) throw new Error(error?.message ?? "Supabase did not return a link.");
  console.info("[support] recovery link made", { targetUserId, actorId });

  const base = env.appUrl.replace(/\/$/, "");
  return `${base}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=recovery&next=/reset-password`;
}
