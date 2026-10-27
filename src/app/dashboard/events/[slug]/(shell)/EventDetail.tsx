import Image from "next/image";
import Link from "next/link";

import { EventCoverPicker } from "@/components/event-cover-picker";
import { EventLinkCard } from "@/components/event-link-card";
import { QrPosterPicker } from "@/components/qr-poster-picker";
import { RetentionNotice } from "@/components/retention-notice";
import { AlertIcon, ExternalIcon } from "@/components/ui/icons";
import { getEventAnalyticsCached, getOwnerEventContext } from "@/lib/event-context";
import {
  eventLinks,
  generateUploadQrDataUrl,
  getCoupleUploadEndsAt,
  getEventCoverMap,
  getEventLifecycleStatus,
  getRetentionAccessEndsAt,
  isEventExpired,
  listEventMedia,
} from "@/lib/events";
import { getDictionary, localePrefix, t, type Locale } from "@/lib/i18n/index";
import { enrichMediaWithUrls } from "@/lib/media";
import { countReportsByMedia } from "@/lib/media-reports";
import { retentionSchedule } from "@/lib/retention";
import { cn, formatBytes, formatDate, statusBadgeClass } from "@/lib/utils";

/**
 * The event's overview: what it is, how it is doing, and the two links —
 * the one guests use on the day and the one that goes out afterwards.
 * Uploading and sorting live on the gallery page, settings on their own.
 */
export async function EventDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const dict = getDictionary(locale);
  const d = dict.dashboard;
  const e = d.event;
  const l = e.layout;
  const live = dict.liveSlideshow;
  const prefix = localePrefix(locale);

  const { event, isCouple } = await getOwnerEventContext(slug);

  const [analytics, media, qrCode, coverMap, reportCounts] = await Promise.all([
    getEventAnalyticsCached(event.id),
    listEventMedia(event.id, { includeHidden: true, includeDeleted: false, sourceType: "all" }).then(enrichMediaWithUrls),
    generateUploadQrDataUrl(event.slug),
    getEventCoverMap([event]),
    countReportsByMedia(event.id),
  ]);

  const cover = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;
  const links = eventLinks(event.slug);
  const expired = isEventExpired(event);
  const lifecycleStatus = getEventLifecycleStatus(event);
  const coupleUploadEndsAt = isCouple ? getCoupleUploadEndsAt(event) : null;
  const galleryHref = `${prefix}/dashboard/events/${event.slug}/gallery`;

  // Only what guests can already see may become the cover: it heads the public gallery.
  const coverCandidates = media
    .filter((item) => item.mime_type.startsWith("image/") && !item.hidden_at && !item.deleted_at && item.thumbnailUrl)
    .map((item) => ({ id: item.id, thumbnailUrl: item.thumbnailUrl as string }));
  // Guest uploads arrive hidden; these are the ones nobody has let through yet.
  const pendingGuestFiles = media.filter((item) => item.source_type === "guest" && item.hidden_at).length;
  // Reported files still in the gallery (a deleted one needs no more attention).
  const reportedFiles = media.filter((item) => (reportCounts.get(item.id) ?? 0) > 0).length;

  const stats = [
    { label: e.mediaFiles, value: String(analytics.mediaCount) },
    { label: e.guestUploads, value: String(analytics.guestUploads) },
    { label: e.storageUsed, value: formatBytes(analytics.storageUsedBytes) },
    { label: e.downloads, value: String(analytics.downloadCount) },
  ];

  const chips = [
    t(e.eventDate, { date: formatDate(event.event_date?.slice(0, 10), locale, d.eventList.notSet) }),
    t(e.expires, { date: formatDate(event.expires_at, locale, d.eventList.notSet) }),
    ...(coupleUploadEndsAt ? [t(e.guestUploadsUntil, { date: formatDate(coupleUploadEndsAt, locale) })] : []),
  ];

  return (
    <>
      {expired ? (
        <p role="status" className="notice notice-error">
          {isCouple ? e.eventExpiredCouple : e.eventExpired}
        </p>
      ) : null}
      {isCouple ? (
        <RetentionNotice
          // Couples own their account, so only the account type matters here.
          schedule={retentionSchedule({ account_type: "couple", created_at: event.created_at }, getRetentionAccessEndsAt(event))}
          kind="couple"
          strings={d.retention}
          locale={locale}
          href={galleryHref}
          cta={d.retention.openGallery}
        />
      ) : null}

      {/* ── The event at a glance: the cover beside its facts and figures ── */}
      <section className="grid gap-[var(--space-lg)] md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[200px] md:max-w-none">
          <EventCoverPicker
            slug={event.slug}
            title={event.title}
            coverUrl={cover?.thumbnailUrl ?? cover?.previewUrl ?? null}
            candidates={coverCandidates}
            strings={e.cover}
          />
        </div>

        <div className="min-w-0 space-y-[var(--space-lg)]">
          <ul className="flex flex-wrap gap-2">
            <li className={cn("chip font-semibold", statusBadgeClass(lifecycleStatus))}>
              {d.eventList.statuses[lifecycleStatus as keyof typeof d.eventList.statuses] ?? lifecycleStatus}
            </li>
            {chips.map((chip) => (
              <li key={chip} className="chip">
                {chip}
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-2 border-y border-rule sm:grid-cols-4 sm:divide-x sm:divide-rule">
            {stats.map((stat) => (
              <div key={stat.label} className="py-[var(--space-md)] sm:px-[var(--space-md)] sm:first:pl-0">
                <dt className="text-sm text-ink-2">{stat.label}</dt>
                <dd className="num mt-1 font-display text-[1.75rem] font-semibold leading-none text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {pendingGuestFiles > 0 || reportedFiles > 0 ? (
            <ul className="space-y-2">
              {pendingGuestFiles > 0 ? (
                <li className="notice notice-warning flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{t(l.pendingReview, { count: pendingGuestFiles })}</span>
                  <Link href={galleryHref} className="link text-current">
                    {l.manageGallery}
                  </Link>
                </li>
              ) : null}
              {reportedFiles > 0 ? (
                <li className="notice notice-error flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <AlertIcon className="h-4 w-4" />
                    {t(l.reportedFiles, { count: reportedFiles })}
                  </span>
                  <Link href={galleryHref} className="link text-current">
                    {l.manageGallery}
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ── The two links, in the order they are used: on the day, after ── */}
      <ol className="grid gap-[var(--space-xl)] border-t border-rule pt-[var(--space-xl)] xl:grid-cols-2 xl:divide-x xl:divide-rule">
        <li className="min-w-0 xl:pr-[var(--space-xl)]">
          <h2 className="app-section-title flex items-baseline gap-3 text-ink">
            <span className="num text-accent">1</span>
            {l.guestsTitle}
          </h2>
          <p className="mt-2 max-w-[60ch] text-ink-2">{l.guestsBody}</p>

          <div className="mt-[var(--space-lg)] grid gap-[var(--space-lg)] sm:grid-cols-[148px_minmax(0,1fr)] sm:items-start">
            <Image
              src={qrCode}
              alt={e.guestQrCode}
              width={400}
              height={400}
              className="mx-auto h-auto w-full max-w-[180px] rounded-[var(--radius-inner)] bg-card p-2 ring-1 ring-rule sm:max-w-none"
            />
            <div className="min-w-0 space-y-3">
              <p className="text-ink-2">{e.qrSharingHint}</p>
              <a href={links.uploadUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-10 items-center gap-1.5 text-sm">
                {l.openGuestPage}
                <ExternalIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Full width: squeezed beside the QR code the address shrank to "https://www…". */}
          <div className="mt-[var(--space-lg)]">
            <EventLinkCard accent title={l.guestLinkLabel} url={links.uploadUrl} copyLabel={e.copyLink} copiedLabel={e.linkCopied} />
          </div>

          <div className="mt-[var(--space-lg)]">
            <QrPosterPicker slug={event.slug} qrCodeDataUrl={qrCode} strings={d.qrPicker} editorHref={`${prefix}/dashboard/events/${event.slug}/qr`} />
          </div>

          <div className="mt-[var(--space-lg)] border-t border-rule pt-[var(--space-lg)]">
            <h3 className="font-semibold text-ink">{live.dashboardTitle}</h3>
            <p className="mt-1 max-w-[60ch] text-ink-2">{live.dashboardBody}</p>
            <a href={`/${locale}/gallery/${event.slug}/live`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary mt-3">
              {live.dashboardCta}
              <ExternalIcon className="h-4 w-4" />
            </a>
          </div>
        </li>

        <li className="min-w-0 xl:pl-[var(--space-xl)]">
          <h2 className="app-section-title flex items-baseline gap-3 text-ink">
            <span className="num text-moss">2</span>
            {l.afterTitle}
          </h2>
          <p className="mt-2 max-w-[60ch] text-ink-2">{isCouple ? l.afterBodyCouple : l.afterBody}</p>

          <div className="mt-[var(--space-lg)]">
            <EventLinkCard title={l.galleryLinkLabel} url={links.galleryUrl} copyLabel={e.copyLink} copiedLabel={e.linkCopied} />
          </div>

          <div className="mt-[var(--space-md)] flex flex-col gap-2 sm:flex-row">
            <Link href={galleryHref} className="btn btn-sm btn-secondary">
              {l.manageGallery}
            </Link>
            <a href={links.galleryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-quiet">
              {l.previewBtn}
              <ExternalIcon className="h-4 w-4" />
            </a>
          </div>

          <p className="meta mt-[var(--space-lg)] max-w-[60ch]">{e.permanentLinksNote}</p>
        </li>
      </ol>
    </>
  );
}
