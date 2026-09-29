import Link from "next/link";
import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard-header";
import { EventNav } from "@/components/event-nav";
import { getEventAnalyticsCached, getOwnerEventContext } from "@/lib/event-context";
import { eventLinks } from "@/lib/events";
import { getDictionary, localePrefix, type Locale } from "@/lib/i18n/index";

/**
 * The frame every event page shares: the header, and a menu that is a
 * sidebar on a wide screen and a sticky row of tabs on a phone.
 *
 * It is rendered by the event layout, so moving between Pregled, Galerija,
 * QR kartica and Postavke only loads the page underneath — the header and the
 * menu stay put, and the layout's loading state shows at once instead of the
 * click appearing to do nothing.
 */
export async function EventShell({
  locale,
  slug,
  children,
}: {
  locale: Locale;
  slug: string;
  children: ReactNode;
}) {
  const d = getDictionary(locale).dashboard;
  const l = d.event.layout;
  const prefix = localePrefix(locale);
  const { event, isCouple } = await getOwnerEventContext(slug);
  const analytics = await getEventAnalyticsCached(event.id);

  return (
    <main className="pb-16">
      <DashboardHeader
        title={event.title}
        eyebrow={event.client_name || (isCouple ? l.eyebrowCouple : l.eyebrow)}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
        action={
          <Link
            href={`${prefix}/dashboard`}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
          >
            {d.event.backToEvents}
          </Link>
        }
      />

      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start">
        <EventNav
          base={`${prefix}/dashboard/events/${event.slug}`}
          galleryUrl={eventLinks(event.slug).galleryUrl}
          galleryCount={analytics.mediaCount}
          strings={{
            menuLabel: l.menuLabel,
            navOverview: l.navOverview,
            navGallery: l.navGallery,
            navQrCard: l.navQrCard,
            navSettings: l.navSettings,
            navPreview: l.navPreview,
          }}
        />

        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </main>
  );
}

/** Shown in place of the page while it loads; the header and menu stay above it. */
export function EventPageSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="h-64 animate-pulse rounded-[28px] border border-black/5 bg-white/70" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-[28px] border border-black/5 bg-white/60" />
        <div className="h-80 animate-pulse rounded-[28px] border border-black/5 bg-white/60" />
      </div>
    </div>
  );
}
