import { randomInt } from "node:crypto";

import { ONE_EVENT_BAM, ONE_EVENT_OFFER_BAM, ONE_EVENT_OFFER_FINAL_BAM } from "@/lib/pricing";

/**
 * The rules of the lead offer, with no database or network in them, so they
 * can be tested on their own (lead-sequence.test.ts).
 *
 * Someone leaves an email on /popust and gets a code. From then on:
 *
 *   day 0                     welcome  – the code, One Event for 69 KM
 *   day `reminder_day`        reminder – only if the code is still unused
 *   `final_days_before`       final    – a further 5 KM off until it expires
 *     days before expiry
 *   day `valid_days`          the code expires
 *
 * The schedule is copied onto each lead when it signs up, so changing the
 * settings later never moves a date an email has already promised.
 */

export type LeadEmailKind = "welcome" | "reminder" | "final";
export type LeadStatus = "active" | "redeemed" | "expired";

export type LeadSettings = {
  is_active: boolean;
  valid_days: number;
  reminder_day: number;
  final_days_before: number;
};

export const DEFAULT_LEAD_SETTINGS: LeadSettings = { is_active: true, valid_days: 30, reminder_day: 10, final_days_before: 3 };

/** No 0/O or 1/I: a code read off a phone screen and typed in must not be ambiguous. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_PATTERN = /^CONF-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

export function newLeadCode(): string {
  const pick = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `CONF-${pick()}-${pick()}`;
}

/** What people type: any case, spaces or dashes anywhere, the prefix or not. */
export function normalizeLeadCode(raw: string): string | null {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
  const body = compact.startsWith("CONF") ? compact.slice(4) : compact;
  if (body.length !== 8) return null;
  const code = `CONF-${body.slice(0, 4)}-${body.slice(4)}`;
  return CODE_PATTERN.test(code) ? code : null;
}

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

const DAY_MS = 86_400_000;

export function validSettings(s: LeadSettings): string | null {
  if (!Number.isInteger(s.valid_days) || s.valid_days < 7 || s.valid_days > 90) return "The code must be valid for 7 to 90 days.";
  if (!Number.isInteger(s.reminder_day) || s.reminder_day < 1) return "The reminder must come on day 1 or later.";
  if (!Number.isInteger(s.final_days_before) || s.final_days_before < 1) return "The last offer must start at least 1 day before expiry.";
  if (s.reminder_day >= s.valid_days - s.final_days_before) {
    return "The reminder must come before the last offer starts.";
  }
  return null;
}

/** The dates a new lead gets, from the settings in force when it signs up. */
export function leadSchedule(settings: LeadSettings, now = new Date()) {
  const start = now.getTime();
  return {
    reminder_at: new Date(start + settings.reminder_day * DAY_MS).toISOString(),
    final_at: new Date(start + (settings.valid_days - settings.final_days_before) * DAY_MS).toISOString(),
    expires_at: new Date(start + settings.valid_days * DAY_MS).toISOString(),
  };
}

export type LeadTiming = {
  status: LeadStatus;
  reminder_at: string;
  final_at: string;
  expires_at: string;
  unsubscribed_at?: string | null;
};

export function isExpired(lead: Pick<LeadTiming, "expires_at">, now = new Date()) {
  return new Date(lead.expires_at).getTime() <= now.getTime();
}

/**
 * The email this lead should get now, if any. A lead that missed its reminder
 * (the sender did not run that day) and is already in the last-offer window
 * gets the last offer, not both.
 */
export function dueLeadEmail(lead: LeadTiming, sent: ReadonlySet<LeadEmailKind>, now = new Date()): LeadEmailKind | null {
  if (lead.status !== "active" || lead.unsubscribed_at || isExpired(lead, now)) return null;
  if (!sent.has("welcome")) return "welcome";
  const t = now.getTime();
  if (t >= new Date(lead.final_at).getTime()) return sent.has("final") ? null : "final";
  if (t >= new Date(lead.reminder_at).getTime() && !sent.has("reminder")) return "reminder";
  return null;
}

export type OfferTier = "offer" | "final";

/** Which price a code buys right now: the last offer is a window, not an email. */
export function offerTier(lead: Pick<LeadTiming, "final_at" | "expires_at">, now = new Date()): OfferTier | null {
  const t = now.getTime();
  if (t >= new Date(lead.expires_at).getTime()) return null;
  return t >= new Date(lead.final_at).getTime() ? "final" : "offer";
}

export const OFFER_PRICE_BAM: Record<OfferTier, number> = { offer: ONE_EVENT_OFFER_BAM, final: ONE_EVENT_OFFER_FINAL_BAM };
export const OFFER_FULL_PRICE_BAM = ONE_EVENT_BAM;

/** Whole days left, counted up: 2.1 days left reads "3 days". */
export function daysLeft(expiresAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS));
}

/** Short campaign labels from the ad's URL, trimmed to what the table holds. */
export function cleanUtm(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9._ -]/g, "").slice(0, 100);
  return v || null;
}
