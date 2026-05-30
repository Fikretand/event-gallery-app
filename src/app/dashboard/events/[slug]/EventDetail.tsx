import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { EventSettingsForm } from "@/components/event-settings-form";
import { EventLifecyclePanel } from "@/components/event-lifecycle-panel";
import { GallerySectionsManager } from "@/components/gallery-sections-manager";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MediaGrid } from "@/components/media-grid";
import { QrPosterPicker } from "@/components/qr-poster-picker";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Panel } from "@/components/ui/panel";
import { updateEventAction } from "@/lib/actions";
import { getAccountTypeForUser, getRequiredUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import {
  eventLinks,
  generateUploadQrDataUrl,
  getCoupleAccessEndsAt,
  getCoupleUploadEndsAt,
  getEventLifecycleStatus,
  listGallerySections,
  listEventActivity,
  getEventAnalytics,
  getEventCoverMap,
  getOwnerEventBySlug,
  isEventExpired,
  listEventMedia,
} from "@/lib/events";
import { getDictionary, localePrefix, t, type Locale } from "@/lib/i18n/index";
import { enrichMediaWithUrls } from "@/lib/media";
import { cn, formatBytes, formatDate, statusBadgeClass } from "@/lib/utils";

type EventStrings = ReturnType<typeof getDictionary>["dashboard"]["event"];

function activityLabel(action: string, labels: EventStrings["activityLabels"]): string {
  return labels[action as keyof typeof labels] ?? action;
}

export async function EventDetail({
  locale,
  slug,
  searchParams,
}: {
  locale: Locale;
  slug: string;
  searchParams?: { saved?: string };
}) {
  const d = getDictionary(locale).dashboard;
  const e = d.event;
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

  const [analytics, media, qrCode, activity, sections] = await Promise.all([
    getEventAnalytics(event.id),
    listEventMedia(event.id, { includeHidden: true, includeDeleted: true, sourceType: "all" }).then(enrichMediaWithUrls),
    generateUploadQrDataUrl(event.slug),
    listEventActivity(event.id),
    listGallerySections(event.id),
  ]);

  const coverMap = await getEventCoverMap([event]);
  const cover = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;
  const links = eventLinks(event.slug);
  const expired = isEventExpired(event);
  const lifecycleStatus = getEventLifecycleStatus(event);
  const coupleUploadEndsAt = isCouple ? getCoupleUploadEndsAt(event) : null;
  const coupleAccessEndsAt = isCouple ? getCoupleAccessEndsAt(event) : null;

  return (
    <main className="pb-16">
      <DashboardHeader
        title={event.title}
        eyebrow={event.client_name || (isCouple ? "Your private event" : "Private event")}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
        action={
          <Link
            href={`${prefix}/dashboard`}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
          >
            {e.backToEvents}
          </Link>
        }
      />

      <section className="shell space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel className="min-w-0 bg-white/90">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-5">
                <div className="flex flex-wrap gap-3 text-sm text-black/60">
                  <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">
                    {t(e.eventDate, { date: formatDate(event.event_date) })}
                  </span>
                  <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">
                    {t(e.expires, { date: formatDate(event.expires_at) })}
                  </span>
                  {isCouple && coupleUploadEndsAt ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">
                      {t(e.guestUploadsUntil, { date: formatDate(coupleUploadEndsAt) })}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full px-4 py-2 capitalize",
                      statusBadgeClass(lifecycleStatus),
                    )}
                  >
                    {lifecycleStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{e.mediaFiles}</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{analytics.mediaCount}</p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{e.guestUploads}</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{analytics.guestUploads}</p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{e.storageUsed}</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                      {formatBytes(analytics.storageUsedBytes)}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{e.downloads}</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{analytics.downloadCount}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-black/10 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{e.guestUploadLink}</p>
                    <p className="mt-3 break-all text-sm text-[var(--color-ink)]">{links.uploadUrl}</p>
                  </div>
                  <div className="rounded-[24px] border border-black/10 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                      {isCouple ? e.privateGalleryLink : e.clientGalleryLink}
                    </p>
                    <p className="mt-3 break-all text-sm text-[var(--color-ink)]">{links.galleryUrl}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-dashed border-black/10 bg-[var(--color-paper)]/45 px-4 py-3 text-sm leading-6 text-black/62">
                  {e.permanentLinksNote}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={links.uploadUrl}
                    className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isCouple ? e.openGuestUploadPage : e.openGuestPage}
                  </Link>
                  <Link
                    href={links.galleryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    {isCouple ? e.openPrivateGallery : e.openClientGallery}
                  </Link>
                </div>

                {expired ? (
                  <div className="rounded-[24px] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#8a1c1c]">
                    {isCouple ? e.eventExpiredCouple : e.eventExpired}
                  </div>
                ) : null}
              </div>

              <div className="w-full max-w-[280px] shrink-0">
                <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.thumbnailUrl ?? cover.previewUrl ?? undefined}
                      alt={`${event.title} cover`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-6 text-center text-sm leading-6 text-black/45">
                      {isCouple ? e.coverImageHintCouple : e.coverImageHint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="min-w-0 bg-white/92">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">{e.guestQrCode}</p>
            <div className="mt-4 rounded-[28px] bg-[var(--color-paper)] p-6">
              <Image
                src={qrCode}
                alt={`QR code for ${event.title}`}
                width={400}
                height={400}
                className="h-auto w-full rounded-[20px]"
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-black/58">{e.qrSharingHint}</p>
            <div className="mt-6 border-t border-black/8 pt-6">
              <QrPosterPicker
                slug={event.slug}
                qrCodeDataUrl={qrCode}
                strings={d.qrPicker}
                editorHref={`${prefix}/dashboard/events/${event.slug}/qr-card-editor`}
              />
            </div>
          </Panel>
        </div>

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? e.uploadYourTitle : e.uploadProTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple ? e.uploadYourBody : e.uploadProBody}
          </p>
          <div className="mt-5">
            <UploadDropzone
              endpoint={`/api/events/${event.slug}/photographer-upload-session`}
              target="photographer"
              allowVideo={true}
              pinRequired={false}
              audience={accountType}
            />
          </div>
        </Panel>

        <EventSettingsForm
          event={event}
          action={updateEventAction.bind(null, event.slug)}
          saved={searchParams?.saved === "1"}
          audience={accountType}
          expiresAtMax={coupleAccessEndsAt ? coupleAccessEndsAt.slice(0, 16) : undefined}
          planWindow={
            isCouple && coupleUploadEndsAt && coupleAccessEndsAt
              ? {
                  uploadEndsLabel: formatDate(coupleUploadEndsAt),
                  accessEndsLabel: formatDate(coupleAccessEndsAt),
                }
              : null
          }
        />

        {!isCouple ? (
          <Panel className="bg-white/90">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{e.dangerZone}</h2>
            <p className="mt-2 text-sm leading-6 text-black/62">{e.dangerZoneBody}</p>
            <div className="mt-5">
              <EventLifecyclePanel slug={event.slug} />
            </div>
          </Panel>
        ) : null}

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? e.sectionsTitleCouple : e.sectionsTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple ? e.sectionsBodyCouple : e.sectionsBody}
          </p>
          <div className="mt-5">
            <GallerySectionsManager slug={event.slug} sections={sections} />
          </div>
        </Panel>

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? e.managerTitleCouple : e.managerTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple ? e.managerBodyCouple : e.managerBody}
          </p>
          <div className="mt-5">
            <CollapsibleSection
              totalCount={media.length}
              threshold={12}
              collapsedMaxHeight={720}
              strings={{
                recentLabel: e.managerRecentLabel,
                showAll: e.managerShowAll,
                showFewer: e.managerShowFewer,
              }}
            >
              <MediaGrid
                media={media}
                ownerMode
                eventSlug={event.slug}
                coverImageId={event.cover_image_id}
                audience={accountType}
                sections={sections}
              />
            </CollapsibleSection>
          </div>
        </Panel>

        <Panel className="bg-white/90">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
                  {isCouple ? e.activityTitleCouple : e.activityTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/62">
                  {isCouple ? e.activityBodyCouple : e.activityBody}
                </p>
              </div>
              <span
                aria-hidden
                className="mt-1 shrink-0 rounded-full border border-black/10 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition group-open:bg-[var(--color-paper)]"
              >
                <span className="group-open:hidden">↓</span>
                <span className="hidden group-open:inline">↑</span>
              </span>
            </summary>

            {activity.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-black/10 bg-white/70 px-6 py-10 text-center text-sm text-black/58">
                {e.activityEmpty}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-[24px] border border-black/10 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {activityLabel(item.action, e.activityLabels)}
                      </p>
                      <p className="mt-1 text-sm text-black/58">
                        {typeof item.metadata?.filename === "string" ? item.metadata.filename : e.activityFallback}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/45">{formatDate(item.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </details>
        </Panel>
      </section>
    </main>
  );
}
