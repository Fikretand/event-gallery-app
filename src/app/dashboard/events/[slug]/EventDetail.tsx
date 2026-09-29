import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventCoverPicker } from "@/components/event-cover-picker";
import { EventLinkCard } from "@/components/event-link-card";
import { EventShell } from "@/components/event-shell";
import { QrPosterPicker } from "@/components/qr-poster-picker";
import { Panel } from "@/components/ui/panel";
import { getAccountTypeForUser, getRequiredUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import {
  eventLinks,
  generateUploadQrDataUrl,
  getCoupleUploadEndsAt,
  getEventAnalytics,
  getEventCoverMap,
  getEventLifecycleStatus,
  getOwnerEventBySlug,
  isEventExpired,
  listEventMedia,
} from "@/lib/events";
import { getDictionary, localePrefix, t, type Locale } from "@/lib/i18n/index";
import { enrichMediaWithUrls } from "@/lib/media";
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
  const prefix = localePrefix(locale);

  if (!hasSupabase) {
    notFound();
  }

  const { user, supabase } = await getRequiredUser();
  const event = await getOwnerEventBySlug(user.id, slug);
  if (!event) {
    notFound();
  }
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
  const isCouple = accountType === "couple";

  const [analytics, media, qrCode, coverMap] = await Promise.all([
    getEventAnalytics(event.id),
    listEventMedia(event.id, { includeHidden: true, includeDeleted: false, sourceType: "all" }).then(enrichMediaWithUrls),
    generateUploadQrDataUrl(event.slug),
    getEventCoverMap([event]),
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

  const stats = [
    { label: e.mediaFiles, value: String(analytics.mediaCount) },
    { label: e.guestUploads, value: String(analytics.guestUploads) },
    { label: e.storageUsed, value: formatBytes(analytics.storageUsedBytes) },
    { label: e.downloads, value: String(analytics.downloadCount) },
  ];

  return (
    <EventShell
      active="overview"
      title={event.title}
      clientName={event.client_name}
      isCouple={isCouple}
      prefix={prefix}
      slug={event.slug}
      galleryUrl={links.galleryUrl}
      galleryCount={media.length}
      strings={d}
    >
      {expired ? (
        <div className="rounded-[24px] bg-[#fff0eb] px-5 py-4 text-sm leading-6 text-[#8a1c1c]">
          {isCouple ? e.eventExpiredCouple : e.eventExpired}
        </div>
      ) : null}

      <Panel className="bg-white/90">
        <div className="grid gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[200px] md:max-w-none">
            <EventCoverPicker
              slug={event.slug}
              title={event.title}
              coverUrl={cover?.thumbnailUrl ?? cover?.previewUrl ?? null}
              candidates={coverCandidates}
              strings={e.cover}
            />
          </div>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap gap-2 text-sm text-black/60">
              <span className={cn("rounded-full px-3.5 py-1.5 font-semibold", statusBadgeClass(lifecycleStatus))}>
                {d.eventList.statuses[lifecycleStatus as keyof typeof d.eventList.statuses] ?? lifecycleStatus}
              </span>
              <span className="rounded-full bg-[var(--color-paper)] px-3.5 py-1.5">
                {t(e.eventDate, { date: formatDate(event.event_date?.slice(0, 10), locale, d.eventList.notSet) })}
              </span>
              <span className="rounded-full bg-[var(--color-paper)] px-3.5 py-1.5">
                {t(e.expires, { date: formatDate(event.expires_at, locale, d.eventList.notSet) })}
              </span>
              {coupleUploadEndsAt ? (
                <span className="rounded-full bg-[var(--color-paper)] px-3.5 py-1.5">
                  {t(e.guestUploadsUntil, { date: formatDate(coupleUploadEndsAt, locale) })}
                </span>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[20px] bg-[var(--color-paper)]/65 px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">{stat.label}</dt>
                  <dd className="mt-1.5 text-2xl font-semibold text-[var(--color-ink)]">{stat.value}</dd>
                </div>
              ))}
            </dl>

            {pendingGuestFiles > 0 ? (
              <Link
                href={galleryHref}
                className="flex flex-col gap-1 rounded-[20px] border border-[var(--color-accent)]/25 bg-[#fff6f1] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[#ffefe6] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span>{t(l.pendingReview, { count: pendingGuestFiles })}</span>
                <span className="shrink-0 text-[var(--color-accent)]">{l.manageGallery}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="min-w-0 bg-white/92">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">1</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--color-ink)]">{l.guestsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-black/62">{l.guestsBody}</p>

          <div className="mt-5 grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
            <div className="mx-auto w-full max-w-[200px] rounded-[22px] bg-[var(--color-paper)] p-3 sm:max-w-none">
              <Image
                src={qrCode}
                alt={e.guestQrCode}
                width={400}
                height={400}
                className="h-auto w-full rounded-[14px]"
              />
            </div>
            <div className="min-w-0 space-y-3">
              <p className="text-sm leading-6 text-black/58">{e.qrSharingHint}</p>
              <a
                href={links.uploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                {l.openGuestPage}
              </a>
            </div>
          </div>

          {/* Full width: squeezed beside the QR code the address shrank to "https://www…". */}
          <div className="mt-5">
            <EventLinkCard
              accent
              title={l.guestLinkLabel}
              url={links.uploadUrl}
              copyLabel={e.copyLink}
              copiedLabel={e.linkCopied}
            />
          </div>

          <div className="mt-5 border-t border-black/8 pt-5">
            <QrPosterPicker
              slug={event.slug}
              qrCodeDataUrl={qrCode}
              strings={d.qrPicker}
              editorHref={`${prefix}/dashboard/events/${event.slug}/qr-card-editor`}
            />
          </div>
        </Panel>

        <Panel className="min-w-0 bg-white/92">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">2</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--color-ink)]">{l.afterTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-black/62">{isCouple ? l.afterBodyCouple : l.afterBody}</p>

          <div className="mt-5">
            <EventLinkCard
              title={l.galleryLinkLabel}
              url={links.galleryUrl}
              copyLabel={e.copyLink}
              copiedLabel={e.linkCopied}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={galleryHref}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
            >
              {l.manageGallery}
            </Link>
            <a
              href={links.galleryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
            >
              {l.previewBtn}
            </a>
          </div>

          <p className="mt-5 rounded-[20px] border border-dashed border-black/10 bg-[var(--color-paper)]/45 px-4 py-3 text-xs leading-5 text-black/55">
            {e.permanentLinksNote}
          </p>
        </Panel>
      </div>
    </EventShell>
  );
}
