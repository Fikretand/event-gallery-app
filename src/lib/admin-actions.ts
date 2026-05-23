"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PhotographerPlanTier } from "@/lib/types";

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

export async function adminDeleteUserAction(targetUserId: string) {
  const { admin, actorId } = await requireAdmin();
  if (targetUserId === actorId) throw new Error("You cannot delete your own account.");

  // Delete from auth (cascades to public.users via trigger if configured)
  const { error } = await admin.auth.admin.deleteUser(targetUserId);
  if (error) {
    // Fallback: just wipe from public.users if auth delete fails (e.g. user was never confirmed)
    await admin.from("users").delete().eq("id", targetUserId);
  }

  revalidatePath("/admin");
}
