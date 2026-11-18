"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { incrementRateLimitCount } from "@/lib/events";
import { localePrefix, type Locale } from "@/lib/i18n/index";
import { captureLead, resolveOffer, unsubscribeLead } from "@/lib/leads";
import { cleanUtm, normalizeEmail, normalizeLeadCode } from "@/lib/lead-sequence";
import { OFFER_COOKIE, OFFER_COOKIE_OPTIONS, OFFER_OPTED_OUT } from "@/lib/offer-cookie";
import { isRateLimited } from "@/lib/rate-limit";
import { hashIp } from "@/lib/security";

/** Public: answered without an account. Rate-limited by address hash. */

export type CaptureState =
  | { status: "idle" }
  | { status: "sent" | "existing"; email: string }
  | { status: "error"; error: "email" | "consent" | "rate" | "generic" }
  | { status: "closed" };

const LEAD_RATE_LIMIT = { maxRequests: 6, windowMs: 60 * 60_000 };

export async function captureLeadAction(locale: Locale, _prev: CaptureState, formData: FormData): Promise<CaptureState> {
  // A field people never see; a bot that fills every input gets a quiet "sent".
  if (String(formData.get("website") ?? "").trim()) return { status: "sent", email: "" };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { status: "error", error: "email" };
  if (formData.get("consent") !== "on") return { status: "error", error: "consent" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  const ipHash = hashIp(ip);
  if (await isRateLimited(`lead:${ipHash ?? ip}`, LEAD_RATE_LIMIT.maxRequests, LEAD_RATE_LIMIT.windowMs, incrementRateLimitCount)) {
    return { status: "error", error: "rate" };
  }

  try {
    const result = await captureLead({
      email,
      locale,
      consentText: String(formData.get("consentText") ?? "").slice(0, 500),
      source: cleanUtm(String(formData.get("utm_source") ?? "")),
      medium: cleanUtm(String(formData.get("utm_medium") ?? "")),
      campaign: cleanUtm(String(formData.get("utm_campaign") ?? "")),
      ipHash,
    });
    if (result === "closed") return { status: "closed" };
    return { status: result === "existing" ? "existing" : "sent", email };
  } catch (cause) {
    console.error("[leads] capture failed", cause instanceof Error ? cause.message : cause);
    return { status: "error", error: "generic" };
  }
}

export type CodeState = { error?: "invalid" | "expired" | "redeemed" | "unavailable" };

/** The billing page's "Have a discount code?" field. */
export async function applyOfferCodeAction(locale: Locale, _prev: CodeState, formData: FormData): Promise<CodeState> {
  const code = normalizeLeadCode(String(formData.get("code") ?? ""));
  if (!code) return { error: "invalid" };
  const offer = await resolveOffer(code);
  if (!offer.ok) return { error: offer.reason };
  (await cookies()).set(OFFER_COOKIE, code, OFFER_COOKIE_OPTIONS);
  redirect(`${localePrefix(locale)}/dashboard/billing`);
}

/** Also stops the code made for the account's own address from applying by itself. */
export async function removeOfferCodeAction(locale: Locale) {
  (await cookies()).set(OFFER_COOKIE, OFFER_OPTED_OUT, OFFER_COOKIE_OPTIONS);
  redirect(`${localePrefix(locale)}/dashboard/billing`);
}

export type UnsubscribeState = { status: "idle" | "done" | "invalid" };

export async function unsubscribeLeadAction(_prev: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  const ok = await unsubscribeLead(String(formData.get("t") ?? ""));
  return { status: ok ? "done" : "invalid" };
}
