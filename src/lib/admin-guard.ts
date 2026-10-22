import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Admin pages read every account with the service role. The layout used to be
 * the only check, and whether a page can render without its layout (an RSC
 * request for the page segment) is framework behaviour this app should not
 * bet on, so each page calls this before it reads anything. Non-admins go to
 * their dashboard.
 */
export async function requireAdminPage() {
  const { user } = await getRequiredUser();

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/dashboard");

  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");

  return { admin, user };
}
