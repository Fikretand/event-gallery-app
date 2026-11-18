"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { resendWelcome, runLeadSequence, sendLeadEmail, type Lead } from "@/lib/leads";
import { firstEmailKind, validSettings, type LeadSettings } from "@/lib/lead-sequence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** What /admin/leads can change. Each action checks the admin role itself. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const { user } = await getRequiredUser();
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Admin client unavailable.");
  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");
  return { admin, actorId: user.id };
}

export type SettingsState = { error?: string; saved?: boolean };

export async function saveLeadSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { admin } = await requireAdmin();
  const settings: LeadSettings = {
    is_active: formData.get("is_active") === "on",
    valid_days: Number.parseInt(String(formData.get("valid_days") ?? ""), 10),
    reminder_day: Number.parseInt(String(formData.get("reminder_day") ?? ""), 10),
    final_days_before: Number.parseInt(String(formData.get("final_days_before") ?? ""), 10),
    trial_is_active: formData.get("trial_is_active") === "on",
    trial_valid_days: Number.parseInt(String(formData.get("trial_valid_days") ?? ""), 10),
  };
  const problem = validSettings(settings);
  if (problem) return { error: problem };
  const { error } = await admin
    .from("lead_settings")
    .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/admin/leads");
  revalidatePath("/[locale]/popust", "page");
  return { saved: true };
}

/** Send what is due now instead of waiting for tomorrow's run. */
export async function runLeadSequenceAction() {
  await requireAdmin();
  const report = await runLeadSequence({ limit: 60 });
  revalidatePath("/admin/leads");
  return report;
}

/** The welcome email again: the first one if it never went out, otherwise a copy. */
export async function resendLeadWelcomeAction(leadId: string) {
  const { admin } = await requireAdmin();
  if (!UUID.test(leadId)) throw new Error("Invalid id.");
  const { data } = await admin.from("leads").select("*, lead_emails(kind, status)").eq("id", leadId).maybeSingle();
  if (!data) throw new Error("Lead not found.");
  const { lead_emails, ...lead } = data as Lead & { lead_emails: { kind: string; status: string }[] };
  const first = firstEmailKind(lead);
  const welcomeSent = lead_emails.some((e) => e.kind === first && e.status === "sent");
  const outcome = welcomeSent ? await resendWelcome(lead) : await sendLeadEmail(lead, first);
  revalidatePath("/admin/leads");
  if (outcome === "failed") throw new Error("Resend refused it; see the error in the row.");
  if (outcome === "skipped") throw new Error("Not sent: the code is used, expired or unsubscribed, or a copy went out in the last hour.");
}

/** Remove a lead and its email history for good (a deletion request). */
export async function deleteLeadAction(leadId: string) {
  const { admin } = await requireAdmin();
  if (!UUID.test(leadId)) throw new Error("Invalid id.");
  const { error } = await admin.from("leads").delete().eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
}
