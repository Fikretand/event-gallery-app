import { cookies } from "next/headers";

import { normalizeLeadCode } from "@/lib/lead-sequence";

/**
 * The lead's discount code, carried from the email's button
 * (/popust/iskoristi) or the billing page's field to the checkout. It only
 * remembers what was typed: every read is checked again by resolveOffer().
 *
 * "none" means the person pressed "Remove code": the code made for their own
 * address is then not applied by itself either (see currentOffer()).
 */
export const OFFER_COOKIE = "confetti_offer";
export const OFFER_OPTED_OUT = "none";

export const OFFER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 31,
};

export async function readOfferCookie(): Promise<{ code: string | null; optedOut: boolean }> {
  const raw = (await cookies()).get(OFFER_COOKIE)?.value;
  if (raw === OFFER_OPTED_OUT) return { code: null, optedOut: true };
  return { code: raw ? normalizeLeadCode(raw) : null, optedOut: false };
}

export async function readOfferCode(): Promise<string | null> {
  return (await readOfferCookie()).code;
}
