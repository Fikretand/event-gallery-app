import { activeLeadCodeForEmail, resolveOffer, type ResolvedOffer } from "@/lib/leads";
import { readOfferCookie } from "@/lib/offer-cookie";

/**
 * The discount a signed-in buyer gets, decided the same way for the billing
 * page and the checkout, so the price shown is the price charged:
 *
 * 1. the code in the cookie (the email's button or the billing page's field);
 * 2. otherwise, or if that code no longer works, the live code made for the
 *    account's own address, so someone who signs up with the address their
 *    code came to (or got an after-trial offer) never has to type it.
 *
 * "Remove code" turns both off. Returns null when there is nothing to show,
 * or the cookie code's failure when it fails and the address has no code.
 */
export async function currentOffer(userEmail: string | null | undefined): Promise<ResolvedOffer | null> {
  const cookie = await readOfferCookie();
  if (cookie.optedOut) return null;
  const fromCookie = cookie.code ? await resolveOffer(cookie.code) : null;
  if (fromCookie?.ok) return fromCookie;
  const own = await activeLeadCodeForEmail(userEmail);
  if (own && own !== cookie.code) {
    const fromEmail = await resolveOffer(own);
    if (fromEmail.ok) return fromEmail;
  }
  return fromCookie;
}
