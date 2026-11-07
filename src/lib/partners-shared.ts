/**
 * Partner offers, the part both the server and the admin form need: the
 * placements, the row type and pure helpers. No database or storage code
 * here, so client components can import it.
 */

export const OFFER_PLACEMENTS = ["create_event", "couple_dashboard", "photographer_dashboard"] as const;
export type OfferPlacement = (typeof OFFER_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<OfferPlacement, string> = {
  create_event: "Create event page",
  couple_dashboard: "Couple dashboard",
  photographer_dashboard: "Photographer dashboard",
};

export type PartnerOffer = {
  id: string;
  partner_name: string;
  headline: string;
  body: string | null;
  discount_code: string | null;
  link_url: string | null;
  image_key: string | null;
  placements: OfferPlacement[];
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  click_count: number;
  created_at: string;
  updated_at: string;
};

export type OfferStatus = "live" | "scheduled" | "ended" | "paused";

/** Where an offer stands at `now`: shown, waiting for its start, over, or switched off. */
export function offerStatus(offer: Pick<PartnerOffer, "is_active" | "starts_at" | "ends_at">, now = new Date()): OfferStatus {
  if (!offer.is_active) return "paused";
  if (new Date(offer.starts_at) > now) return "scheduled";
  if (offer.ends_at && new Date(offer.ends_at) <= now) return "ended";
  return "live";
}

/** Partner images always sit under partners/<offer id>/; anything else is never signed. */
export function isPartnerImageKey(key: string | null | undefined, offerId: string): key is string {
  if (typeof key !== "string") return false;
  const prefix = `partners/${offerId}/`;
  return key.startsWith(prefix) && key.length > prefix.length && !key.includes("..") && !/[\\\u0000-\u001f]/.test(key);
}

/** Only https links leave the site from an offer. */
export function safeOfferLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
