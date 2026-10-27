import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { LiveSlideshow } from "@/components/live-slideshow";
import { Panel } from "@/components/ui/panel";
import { customTitle } from "@/lib/custom-copy";
import { eventLinks, getPublicEventBySlug, isEventExpired } from "@/lib/events";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { listLiveSlides, resolveLiveAccess } from "@/lib/live-slides";
import { QR_COLORS } from "@/lib/brand-colors";

/**
 * Full-screen live view for a TV or projector at the venue: the gallery's
 * photos change by themselves, new ones appear within seconds, and a QR code
 * in the corner sends guests to the upload page.
 */
export default async function LiveGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ pending?: string }>;
}) {
  const [{ locale, slug }, { pending }] = await Promise.all([params, searchParams]);
  const lang: Locale = locale === "en" ? "en" : "bs";

  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const dict = getDictionary(lang);
  const s = dict.liveSlideshow;
  const title = customTitle(event.custom_copy, "event.galleryTitle", event.title);
  const access = await resolveLiveAccess(event);

  if (!access) {
    // Archived or expired: the gallery's own wording. Otherwise the PIN gate,
    // which is unlocked on the gallery page itself.
    const closed = event.status === "archived" ? dict.gallery.archived : isEventExpired(event) ? dict.gallery.expired : null;
    return (
      <main className="min-h-dvh py-[var(--space-3xl)]">
        <section className="shell">
          <Panel className="max-w-lg">
            <h1 className="display-s text-ink">{closed ? title : s.lockedTitle}</h1>
            <p className="mt-[var(--space-md)] text-ink-2">{closed ?? s.lockedBody}</p>
            {closed ? null : (
              <Link
                href={`/${lang}/gallery/${event.slug}`}
                className="btn btn-primary mt-[var(--space-lg)]"
              >
                {s.lockedCta}
              </Link>
            )}
          </Panel>
        </section>
      </main>
    );
  }

  const isOwner = access === "owner";
  const includePending = isOwner && pending === "1";
  const [slides, qrSvg] = await Promise.all([
    listLiveSlides(event.id, includePending),
    QRCode.toString(eventLinks(event.slug).uploadUrl, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: QR_COLORS,
    }),
  ]);

  return (
    <LiveSlideshow
      slug={event.slug}
      title={title}
      initialSlides={slides}
      initialIncludePending={includePending}
      isOwner={isOwner}
      qrSvg={qrSvg}
      strings={s}
    />
  );
}
