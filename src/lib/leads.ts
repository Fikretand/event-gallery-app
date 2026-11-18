import { randomBytes } from "node:crypto";

import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { renderLeadEmail } from "@/lib/lead-emails";
import {
  DEFAULT_LEAD_SETTINGS,
  OFFER_FULL_PRICE_BAM,
  OFFER_PRICE_BAM,
  daysLeft,
  dueLeadEmail,
  leadSchedule,
  newLeadCode,
  normalizeLeadCode,
  offerTier,
  type LeadEmailKind,
  type LeadSettings,
  type LeadStatus,
  type OfferTier,
} from "@/lib/lead-sequence";
import type { Locale } from "@/lib/i18n/index";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The lead offer, server side: capture on /popust, the three emails, the code
 * at checkout, and what the admin sees at /admin/leads. The rules themselves
 * (when an email is due, what a code costs) are in lead-sequence.ts; this file
 * reads and writes the tables and talks to Resend.
 *
 * Tables (round5_leads.sql) are service role only.
 */

export type Lead = {
  id: string;
  email: string;
  locale: Locale;
  code: string;
  status: LeadStatus;
  created_at: string;
  reminder_at: string;
  final_at: string;
  expires_at: string;
  consent_at: string;
  consent_text: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  unsubscribe_token: string;
  unsubscribed_at: string | null;
  welcome_resent_at: string | null;
  redeemed_at: string | null;
  redeemed_user_id: string | null;
  redeemed_price_bam: number | null;
  redeemed_payment_id: string | null;
  last_checkout_error: string | null;
  last_checkout_error_at: string | null;
};

export type LeadEmailRow = {
  lead_id: string;
  kind: LeadEmailKind;
  status: "sending" | "sent" | "failed";
  attempts: number;
  error: string | null;
  sent_at: string | null;
  updated_at: string;
};

/** A failed email is tried again on later runs, at most this many times in all. */
export const MAX_EMAIL_ATTEMPTS = 4;
/** A "sending" row older than this belongs to a run that died mid-send. */
const STALE_SENDING_MS = 30 * 60_000;

function admin() {
  return createSupabaseAdminClient();
}

function siteUrl() {
  return env.appUrl.replace(/\/$/, "");
}

export async function getLeadSettings(): Promise<LeadSettings> {
  const client = admin();
  if (!client) return DEFAULT_LEAD_SETTINGS;
  const { data } = await client.from("lead_settings").select("is_active, valid_days, reminder_day, final_days_before").eq("id", 1).maybeSingle();
  return (data as LeadSettings | null) ?? DEFAULT_LEAD_SETTINGS;
}

// ─── Offer at checkout ─────────────────────────────────────────────────────

export type ResolvedOffer =
  | { ok: true; lead: Lead; tier: OfferTier; priceBam: number; planId: string }
  | { ok: false; reason: "invalid" | "expired" | "redeemed" | "unavailable" };

/** The Whop plan that charges a tier's price; null until the owner sets it up. */
export function offerPlanId(tier: OfferTier): string | null {
  return (tier === "final" ? env.whopPlanOneEventOfferFinal : env.whopPlanOneEventOffer) ?? null;
}

/**
 * What a typed or linked code buys right now. The billing page and the
 * checkout route both ask this, so the price shown is the price charged.
 */
export async function resolveOffer(rawCode: string | null | undefined, now = new Date()): Promise<ResolvedOffer> {
  const code = rawCode ? normalizeLeadCode(rawCode) : null;
  if (!code) return { ok: false, reason: "invalid" };
  const client = admin();
  if (!client) return { ok: false, reason: "unavailable" };
  const { data } = await client.from("leads").select("*").eq("code", code).maybeSingle();
  const lead = data as Lead | null;
  if (!lead) return { ok: false, reason: "invalid" };
  if (lead.status === "redeemed") return { ok: false, reason: "redeemed" };
  const tier = offerTier(lead, now);
  if (!tier || lead.status === "expired") return { ok: false, reason: "expired" };
  const planId = offerPlanId(tier);
  if (!planId) return { ok: false, reason: "unavailable" };
  return { ok: true, lead, tier, priceBam: OFFER_PRICE_BAM[tier], planId };
}

/**
 * A checkout with this code failed at the payment provider. Kept on the lead
 * so /admin/leads shows the provider's reason after the runtime log is gone.
 */
export async function recordOfferCheckoutError(code: string, message: string) {
  const client = admin();
  if (!client) return;
  const { error } = await client
    .from("leads")
    .update({ last_checkout_error: message.slice(0, 900), last_checkout_error_at: new Date().toISOString() })
    .eq("code", code);
  if (error) console.error("[leads] could not record checkout error", { code, message: error.message });
}

/** Called by the Whop webhook once a purchase made with a code is paid. */
export async function markLeadRedeemed(input: { code: string; userId: string; planId: string | null; paymentId: string | null }) {
  const client = admin();
  if (!client) return;
  const price =
    input.planId && input.planId === env.whopPlanOneEventOfferFinal
      ? OFFER_PRICE_BAM.final
      : input.planId && input.planId === env.whopPlanOneEventOffer
        ? OFFER_PRICE_BAM.offer
        : null;
  const { error } = await client
    .from("leads")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_user_id: input.userId,
      redeemed_price_bam: price,
      redeemed_payment_id: input.paymentId,
    })
    .eq("code", input.code)
    .neq("status", "redeemed");
  if (error) console.error("[leads] could not mark redeemed", { code: input.code, message: error.message });
}

// ─── Sending ───────────────────────────────────────────────────────────────

function redeemUrl(lead: Pick<Lead, "locale" | "code">) {
  return `${siteUrl()}/${lead.locale}/popust/iskoristi?kod=${encodeURIComponent(lead.code)}`;
}

export function unsubscribeUrl(lead: Pick<Lead, "locale" | "unsubscribe_token">) {
  return `${siteUrl()}/${lead.locale}/popust/odjava?t=${encodeURIComponent(lead.unsubscribe_token)}`;
}

function buildEmail(lead: Lead, kind: LeadEmailKind, now: Date) {
  return renderLeadEmail(kind, {
    locale: lead.locale,
    code: lead.code,
    priceBam: OFFER_PRICE_BAM.offer,
    fullPriceBam: OFFER_FULL_PRICE_BAM,
    finalPriceBam: OFFER_PRICE_BAM.final,
    expiresAt: lead.expires_at,
    daysLeft: daysLeft(lead.expires_at, now),
    redeemUrl: redeemUrl(lead),
    unsubscribeUrl: unsubscribeUrl(lead),
    siteUrl: siteUrl(),
  });
}

/**
 * Send one email of the sequence, at most once. The (lead, kind) row is
 * claimed before Resend is called, so two runs at the same moment cannot both
 * send it; a failed row is retried on later runs up to MAX_EMAIL_ATTEMPTS.
 */
export async function sendLeadEmail(lead: Lead, kind: LeadEmailKind, now = new Date()): Promise<"sent" | "skipped" | "failed"> {
  const client = admin();
  if (!client) return "failed";

  let attempts = 1;
  const { error: claimError } = await client.from("lead_emails").insert({ lead_id: lead.id, kind, status: "sending" });
  if (claimError) {
    if (claimError.code !== "23505") {
      console.error("[leads] could not claim email", { leadId: lead.id, kind, message: claimError.message });
      return "failed";
    }
    const { data: row } = await client.from("lead_emails").select("*").eq("lead_id", lead.id).eq("kind", kind).maybeSingle();
    const existing = row as LeadEmailRow | null;
    if (!existing || existing.status === "sent" || existing.attempts >= MAX_EMAIL_ATTEMPTS) return "skipped";
    const stale = Date.now() - new Date(existing.updated_at).getTime() > STALE_SENDING_MS;
    if (existing.status === "sending" && !stale) return "skipped";
    attempts = existing.attempts + 1;
    // Take it over only if nobody else did in the meantime.
    const { data: taken } = await client
      .from("lead_emails")
      .update({ status: "sending", attempts, updated_at: new Date().toISOString() })
      .eq("lead_id", lead.id)
      .eq("kind", kind)
      .eq("attempts", existing.attempts)
      .select("lead_id");
    if (!taken?.length) return "skipped";
  }

  const email = buildEmail(lead, kind, now);
  const result = await sendEmail({
    to: lead.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tag: `lead-${kind}`,
    idempotencyKey: `lead-${lead.id}-${kind}-${attempts}`,
    headers: {
      "List-Unsubscribe": `<${siteUrl()}/api/leads/unsubscribe?t=${encodeURIComponent(lead.unsubscribe_token)}>, <mailto:${env.emailReplyTo}?subject=odjava>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  const stamp = new Date().toISOString();
  await client
    .from("lead_emails")
    .update(
      result.ok
        ? { status: "sent", provider_id: result.id, error: null, sent_at: stamp, updated_at: stamp }
        : {
            status: "failed",
            error: result.error,
            updated_at: stamp,
            // A setup failure (no key, unverified domain) does not use up a try:
            // the email goes out on the first run after the fix, however long
            // the fix takes, as long as the code has not expired.
            ...(result.setup ? { attempts: attempts - 1 } : {}),
          },
    )
    .eq("lead_id", lead.id)
    .eq("kind", kind);
  if (!result.ok) console.error("[leads] email failed", { leadId: lead.id, kind, error: result.error });
  return result.ok ? "sent" : "failed";
}

/** The welcome again, for someone who signs up twice or asks the admin; at most once an hour. */
export async function resendWelcome(lead: Lead): Promise<"sent" | "skipped" | "failed"> {
  if (lead.status !== "active" || lead.unsubscribed_at) return "skipped";
  if (lead.welcome_resent_at && Date.now() - new Date(lead.welcome_resent_at).getTime() < 60 * 60_000) return "skipped";
  const client = admin();
  if (!client) return "failed";
  await client.from("leads").update({ welcome_resent_at: new Date().toISOString() }).eq("id", lead.id);
  const email = buildEmail(lead, "welcome", new Date());
  const result = await sendEmail({
    to: lead.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tag: "lead-welcome-again",
    headers: {
      "List-Unsubscribe": `<${siteUrl()}/api/leads/unsubscribe?t=${encodeURIComponent(lead.unsubscribe_token)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (!result.ok) console.error("[leads] welcome resend failed", { leadId: lead.id, error: result.error });
  return result.ok ? "sent" : "failed";
}

// ─── Capture ───────────────────────────────────────────────────────────────

export type CaptureResult = "sent" | "pending" | "existing" | "closed";

/**
 * A new email from /popust. One lead per address: someone who signs up again
 * gets their code again (if it is still good), not a second code.
 */
export async function captureLead(input: {
  email: string;
  locale: Locale;
  consentText: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  ipHash: string | null;
}): Promise<CaptureResult> {
  const client = admin();
  if (!client) throw new Error("Supabase admin is not configured.");
  const settings = await getLeadSettings();
  if (!settings.is_active) return "closed";

  const { data: existingRow } = await client.from("leads").select("*, lead_emails(kind, status)").eq("email", input.email).maybeSingle();
  if (existingRow) {
    const { lead_emails, ...lead } = existingRow as Lead & { lead_emails: { kind: string; status: string }[] };
    // The first welcome never went out: retry that one (claimed, so the daily
    // run cannot send it a second time). Otherwise send a copy.
    const welcomeSent = lead_emails.some((e) => e.kind === "welcome" && e.status === "sent");
    if (welcomeSent) await resendWelcome(lead);
    else if (lead.status === "active" && !lead.unsubscribed_at) await sendLeadEmail(lead, "welcome");
    return "existing";
  }

  const now = new Date();
  for (let tries = 0; tries < 5; tries += 1) {
    const { data, error } = await client
      .from("leads")
      .insert({
        email: input.email,
        locale: input.locale,
        code: newLeadCode(),
        ...leadSchedule(settings, now),
        consent_at: now.toISOString(),
        consent_text: input.consentText.slice(0, 500),
        source: input.source,
        medium: input.medium,
        campaign: input.campaign,
        ip_hash: input.ipHash,
        unsubscribe_token: randomBytes(24).toString("base64url"),
      })
      .select("*")
      .single();
    if (!error && data) {
      const outcome = await sendLeadEmail(data as Lead, "welcome", now);
      // A failed first send is retried by the daily run; the person still sees
      // "on its way", and the admin sees the failure.
      return outcome === "sent" ? "sent" : "pending";
    }
    if (error?.code !== "23505") throw new Error(error?.message ?? "Lead could not be saved.");
    // The same email at the same moment (a double click) is the other unique
    // conflict: answer as for an existing lead.
    if (error.message.includes("leads_email_unique")) return "existing";
    // Otherwise a code collided: draw another.
  }
  throw new Error("Could not draw a unique code.");
}

// ─── The daily run ─────────────────────────────────────────────────────────

export type SequenceReport = { expired: number; sent: Record<LeadEmailKind, number>; failed: number; skipped: number; remaining: number };

/**
 * Expire old codes, then send every email that is due, oldest leads first.
 * `limit` keeps a run inside the function's time and Resend's daily quota;
 * whatever is left goes out on the next run.
 */
export async function runLeadSequence({ limit = 80, now = new Date() }: { limit?: number; now?: Date } = {}): Promise<SequenceReport> {
  const report: SequenceReport = { expired: 0, sent: { welcome: 0, reminder: 0, final: 0 }, failed: 0, skipped: 0, remaining: 0 };
  const client = admin();
  if (!client) return report;
  const nowIso = now.toISOString();

  const { data: expired } = await client
    .from("leads")
    .update({ status: "expired" })
    .eq("status", "active")
    .lte("expires_at", nowIso)
    .select("id");
  report.expired = expired?.length ?? 0;

  const { data } = await client
    .from("leads")
    .select("*, lead_emails(kind, status, attempts)")
    .eq("status", "active")
    .is("unsubscribed_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(2000);

  type Row = Lead & { lead_emails: { kind: LeadEmailKind; status: string; attempts: number }[] };
  const due: { lead: Lead; kind: LeadEmailKind }[] = [];
  for (const row of (data ?? []) as Row[]) {
    // Sent, or failed for good, counts as done; a failure with tries left does not.
    const done = new Set(
      row.lead_emails.filter((e) => e.status === "sent" || (e.status === "failed" && e.attempts >= MAX_EMAIL_ATTEMPTS)).map((e) => e.kind),
    );
    const kind = dueLeadEmail(row, done, now);
    if (kind) due.push({ lead: row, kind });
  }

  for (const [index, item] of due.entries()) {
    if (index >= limit) {
      report.remaining = due.length - index;
      break;
    }
    const outcome = await sendLeadEmail(item.lead, item.kind, now);
    if (outcome === "sent") report.sent[item.kind] += 1;
    else if (outcome === "failed") report.failed += 1;
    else report.skipped += 1;
    // Resend allows a few requests a second; stay well under it.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.log("[leads] sequence run", report);
  return report;
}

// ─── Unsubscribe ───────────────────────────────────────────────────────────

/** Stop the emails. The code itself keeps working until it expires. */
export async function unsubscribeLead(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false;
  const client = admin();
  if (!client) return false;
  const { data } = await client
    .from("leads")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .is("unsubscribed_at", null)
    .select("id");
  if (data?.length) return true;
  // Already unsubscribed counts as success too.
  const { data: existing } = await client.from("leads").select("id").eq("unsubscribe_token", token).maybeSingle();
  return Boolean(existing);
}

// ─── Admin reads ───────────────────────────────────────────────────────────

export type AdminLead = Lead & {
  emails: Pick<LeadEmailRow, "kind" | "status" | "attempts" | "error" | "sent_at">[];
  /** A couple account with this email that has paid, with or without the code. */
  boughtWithoutCode: boolean;
};

export async function listLeadsForAdmin(filter: { status?: string; q?: string } = {}): Promise<AdminLead[]> {
  const client = admin();
  if (!client) return [];
  let query = client
    .from("leads")
    .select("*, lead_emails(kind, status, attempts, error, sent_at)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter.status === "unsubscribed") query = query.not("unsubscribed_at", "is", null);
  else if (filter.status === "active" || filter.status === "redeemed" || filter.status === "expired") query = query.eq("status", filter.status);
  const q = (filter.q ?? "").trim().toLowerCase().replace(/[,()*%\\:"']/g, "").slice(0, 80);
  if (q.length >= 2) query = query.or(`email.ilike.%${q}%,code.ilike.%${q.toUpperCase()}%`);
  const { data } = await query;
  type Row = Lead & { lead_emails: AdminLead["emails"] };
  const rows = (data ?? []) as Row[];

  // Did people who never used the code buy anyway? Match by account email.
  const open = rows.filter((r) => r.status !== "redeemed").map((r) => r.email);
  const paid = new Set<string>();
  for (let i = 0; i < open.length; i += 200) {
    const { data: users } = await client
      .from("users")
      .select("email")
      .in("email", open.slice(i, i + 200))
      .eq("account_type", "couple")
      .in("subscription_status", ["active", "trialing"]);
    for (const u of users ?? []) paid.add((u.email as string).toLowerCase());
  }

  return rows.map(({ lead_emails, ...lead }) => ({
    ...lead,
    emails: lead_emails ?? [],
    boughtWithoutCode: lead.status !== "redeemed" && paid.has(lead.email),
  }));
}

export type LeadStats = {
  total: number;
  last7Days: number;
  active: number;
  redeemed: number;
  expired: number;
  unsubscribed: number;
  revenueBam: number;
  emails: Record<LeadEmailKind, number>;
  failedEmails: number;
  /** The newest failure's message, so the admin sees why without opening a row. */
  lastError: { error: string; at: string } | null;
  sources: { source: string; count: number; redeemed: number }[];
};

export async function leadStats(): Promise<LeadStats> {
  const stats: LeadStats = {
    total: 0,
    last7Days: 0,
    active: 0,
    redeemed: 0,
    expired: 0,
    unsubscribed: 0,
    revenueBam: 0,
    emails: { welcome: 0, reminder: 0, final: 0 },
    failedEmails: 0,
    lastError: null,
    sources: [],
  };
  const client = admin();
  if (!client) return stats;
  const [{ data: leads }, { data: emails }] = await Promise.all([
    client.from("leads").select("status, created_at, unsubscribed_at, source, redeemed_price_bam").limit(50000),
    client.from("lead_emails").select("kind, status, error, updated_at").limit(150000),
  ]);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const bySource = new Map<string, { count: number; redeemed: number }>();
  for (const l of leads ?? []) {
    stats.total += 1;
    if (new Date(l.created_at as string).getTime() >= weekAgo) stats.last7Days += 1;
    if (l.status === "active") stats.active += 1;
    if (l.status === "redeemed") {
      stats.redeemed += 1;
      stats.revenueBam += (l.redeemed_price_bam as number | null) ?? 0;
    }
    if (l.status === "expired") stats.expired += 1;
    if (l.unsubscribed_at) stats.unsubscribed += 1;
    const key = (l.source as string | null) ?? "direct";
    const entry = bySource.get(key) ?? { count: 0, redeemed: 0 };
    entry.count += 1;
    if (l.status === "redeemed") entry.redeemed += 1;
    bySource.set(key, entry);
  }
  for (const e of emails ?? []) {
    if (e.status === "sent") stats.emails[e.kind as LeadEmailKind] += 1;
    if (e.status === "failed") {
      stats.failedEmails += 1;
      const at = e.updated_at as string;
      if (e.error && (!stats.lastError || at > stats.lastError.at)) stats.lastError = { error: e.error as string, at };
    }
  }
  stats.sources = [...bySource.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return stats;
}
