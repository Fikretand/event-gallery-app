import { getDictionary, t, type Locale } from "@/lib/i18n/index";
import { listLiveOffers, type OfferPlacement } from "@/lib/partners";
import { formatDate } from "@/lib/utils";

/**
 * The live partner offers for one page, set up in /admin/partners. Renders
 * nothing when there are none. Labelled as a partner's offer, and its link is
 * marked sponsored, so it never passes for Confetti's own advice.
 */
export async function PartnerOffers({ placement, locale, className }: { placement: OfferPlacement; locale: Locale; className?: string }) {
  const offers = await listLiveOffers(placement);
  if (offers.length === 0) return null;
  const s = getDictionary(locale).partnerOffers;

  return (
    <section aria-label={s.label} className={className}>
      <ul className="space-y-[var(--space-md)]">
        {offers.map((offer) => (
          <li key={offer.id} className="card overflow-hidden">
            {offer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={offer.imageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full bg-paper-3 object-cover" />
            ) : null}
            <div className="p-[var(--space-lg)]">
              <p className="meta">
                {s.label}: {offer.partner_name}
              </p>
              <p className="title mt-1 text-ink">{offer.headline}</p>
              {offer.body ? <p className="mt-2 text-ink-2">{offer.body}</p> : null}
              {offer.discount_code ? (
                <p className="mt-3 text-sm text-ink-2">
                  {s.codeLabel} <span className="code rounded-[var(--radius-inner)] bg-paper-2 px-2 py-1 font-semibold text-ink">{offer.discount_code}</span>
                </p>
              ) : null}
              {offer.ends_at ? <p className="meta mt-2">{t(s.validUntil, { date: formatDate(offer.ends_at, locale) })}</p> : null}
              {offer.link_url ? (
                <a
                  href={`/api/partners/${offer.id}/click`}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  data-track={`partner_offer_${offer.id}`}
                  className="btn btn-sm btn-secondary mt-[var(--space-md)]"
                >
                  {s.cta}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
