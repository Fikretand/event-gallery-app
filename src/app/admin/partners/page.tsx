import Link from "next/link";

import { requireAdminPage } from "@/lib/admin-guard";
import { PLACEMENT_LABELS, listAllOffers, offerStatus, type OfferStatus } from "@/lib/partners";

import { PartnerRowActions } from "./partner-row-actions";

const STATUS: Record<OfferStatus, { label: string; chip: string }> = {
  live: { label: "Live", chip: "chip-moss" },
  scheduled: { label: "Scheduled", chip: "chip-warning" },
  ended: { label: "Ended", chip: "" },
  paused: { label: "Paused", chip: "" },
};

function day(iso: string | null) {
  if (!iso) return "no end";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Sarajevo" });
}

/** Partner offers: what is showing where, until when, and how often it was clicked. */
export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdminPage();
  const { saved } = await searchParams;
  const offers = await listAllOffers();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="app-title text-ink">Partners</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            Offers from partners, shown on the pages you choose for the dates you set. Customers see them as &quot;Ponuda partnera&quot;. When a page has several live offers they take turns in a slideshow (up to 8 per page), each visitor starting at a different one.
          </p>
        </div>
        <Link href="/admin/partners/new" className="btn btn-primary">
          New offer
        </Link>
      </div>

      {saved ? (
        <p role="status" className="notice notice-success">
          Saved.
        </p>
      ) : null}

      {offers.length === 0 ? (
        <p className="well px-6 py-10 text-ink-2">No offers yet. Add the first one when a partnership starts.</p>
      ) : (
        <ul className="border-t border-rule">
          {offers.map((offer) => {
            const status = STATUS[offerStatus(offer)];
            return (
              <li key={offer.id} className="flex flex-col gap-3 border-b border-rule py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{offer.partner_name}</p>
                    <span className={`chip ${status.chip}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-ink-2">{offer.headline}</p>
                  <p className="meta mt-1">
                    {day(offer.starts_at)} – {day(offer.ends_at)}; {offer.placements.map((p) => PLACEMENT_LABELS[p]).join(", ")};{" "}
                    <span className="num">{offer.click_count}</span> clicks
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/partners/${offer.id}`} className="btn btn-sm btn-secondary">
                    Edit
                  </Link>
                  <PartnerRowActions offerId={offer.id} active={offer.is_active} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
