import { cookies } from "next/headers";

import { normalizeLeadCode } from "@/lib/lead-sequence";

/**
 * The lead's discount code, carried from the email's button
 * (/popust/iskoristi) or the billing page's field to the checkout. It only
 * remembers what was typed: every read is checked again by resolveOffer().
 */
export const OFFER_COOKIE = "confetti_offer";

export const OFFER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 31,
};

export async function readOfferCode(): Promise<string | null> {
  const raw = (await cookies()).get(OFFER_COOKIE)?.value;
  return raw ? normalizeLeadCode(raw) : null;
}
