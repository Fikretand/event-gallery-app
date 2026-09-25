"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { deleteStoredObject } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PhotographerPlanTier, SubscriptionStatus } from "@/lib/types";

async function requireAdmin() {
  const { user } = await getRequiredUser();
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Admin client unavailable.");

  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");

  return { admin, actorId: user.id };
}

export async function adminSetPlanAction(targetUserId: string, planTier: PhotographerPlanTier) {
  const { admin } = await requireAdmin();
  const { error } = await admin.from("users").update({ plan_tier: planTier }).eq("id", targetUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function adminSetRoleAction(targetUserId: string, role: "admin" | "photographer") {
  const { admin } = await requireAdmin();
  const { error } = await admin.from("users").update({ role }).eq("id", targetUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/**
 * Manually set a user's subscription status — the BiH bank-transfer path:
 * after a manual payment, an admin marks the account "active" so trial limits
 * stop applying. Set to null to revert to trial behaviour.
 */
export async function adminSetSubscriptionAction(
  targetUserId: string,
  status: SubscriptionStatus,
) {
  const { admin } = await requireAdmin();
  const { error } = await admin
    .from("users")
    .update({
      subscription_status: status,
      subscription_provider: status ? "manual" : null,
    })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/** Deleting a large account should not open thousands of R2 requests at once. */
const DELETE_CONCURRENCY = 25;

async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += DELETE_CONCURRENCY) {
    await Promise.all(keys.slice(i, i + DELETE_CONCURRENCY).map((key) => deleteStoredObject(key)));
  }
}

/**
 * Remove an account and everything it owns.
 *
 * The previous version called auth.admin.deleteUser and assumed the rest would
 * follow "via trigger if configured". It was not configured: there is no
 * trigger on auth.users DELETE and no foreign key from public.users to
 * auth.users, so a successful delete left the public.users row — and through it
 * every event and media row — in place, and never touched R2 at all. A deleted
 * user's photographs stayed in storage indefinitely.
 *
 * Order matters. Files go first, because the media rows are the only record of
 * where they are, and deleting public.users cascades those rows away. Then the
 * profile row (cascading events, media, settings, sections, sessions), then the
 * auth user last. Each step is safe to retry: if anything fails the action
 * throws, and running it again picks up where it stopped.
 */
export async function adminDeleteUserAction(targetUserId: string) {
  const { admin, actorId } = await requireAdmin();
  if (targetUserId === actorId) throw new Error("You cannot delete your own account.");

  // 1. Storage — while the rows that point at it still exist.
  const [{ data: profile, error: profileError }, { data: events, error: eventsError }] = await Promise.all([
    admin.from("users").select("avatar_url").eq("id", targetUserId).maybeSingle(),
    admin.from("events").select("id").eq("owner_user_id", targetUserId),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (eventsError) throw new Error(eventsError.message);

  const keys: string[] = [];
  if (profile?.avatar_url) keys.push(profile.avatar_url);

  const eventIds = (events ?? []).map((event) => event.id);
  if (eventIds.length > 0) {
    const { data: media, error: mediaError } = await admin
      .from("media_files")
      .select("storage_key, thumbnail_key")
      .in("event_id", eventIds);
    if (mediaError) throw new Error(mediaError.message);
    for (const item of media ?? []) {
      if (item.storage_key) keys.push(item.storage_key);
      if (item.thumbnail_key) keys.push(item.thumbnail_key);
    }
  }

  await deleteObjects(keys);

  // 2. The profile row, which cascades everything the account owns.
  const { error: rowError } = await admin.from("users").delete().eq("id", targetUserId);
  if (rowError) throw new Error(rowError.message);

  // 3. The login itself. A retry after a partial run finds it already gone.
  const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);
  if (authError && authError.status !== 404) throw new Error(authError.message);

  revalidatePath("/admin");
}
