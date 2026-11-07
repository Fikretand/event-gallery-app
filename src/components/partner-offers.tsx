import { PartnerOfferCarousel } from "@/components/partner-offer-carousel";
import { getDictionary, t, type Locale } from "@/lib/i18n/index";
import { listLiveOffers, randomStart, rotateOffers, type OfferPlacement } from "@/lib/partners";
import { formatDate } from "@/lib/utils";

/**
 * The live partner offers for one page, set up in /admin/partners. Renders
 * nothing when there are none, one card for one offer, and a slideshow for
 * several (each visitor starts at a different offer). Labelled as a partner's
 * offer, and its link is marked sponsored, so it never passes for Confetti's
 * own advice.
 */
export async function PartnerOffers({ placement, locale, className }: { placement: OfferPlacement; locale: Locale; className?: string }) {
  const live = await listLiveOffers(placement);
  if (live.length === 0) return null;
  const s = getDictionary(locale).partnerOffers;
  const offers = rotateOffers(live, randomStart(live.length)).map((offer) => ({
    id: offer.id,
    partnerName: offer.partner_name,
    headline: offer.headline,
    body: offer.body,
    code: offer.discount_code,
    validUntil: offer.ends_at ? t(s.validUntil, { date: formatDate(offer.ends_at, locale) }) : null,
    imageUrl: offer.imageUrl,
    hasLink: Boolean(offer.link_url),
  }));

  return (
    <div className={className}>
      <PartnerOfferCarousel
        offers={offers}
        strings={{ label: s.label, cta: s.cta, codeLabel: s.codeLabel, previous: s.previous, next: s.next, pause: s.pause, play: s.play, slideOf: s.slideOf }}
      />
    </div>
  );
}
