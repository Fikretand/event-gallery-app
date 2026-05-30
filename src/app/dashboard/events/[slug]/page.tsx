import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { EventSettingsForm } from "@/components/event-settings-form";
import { EventLifecyclePanel } from "@/components/event-lifecycle-panel";
import { GallerySectionsManager } from "@/components/gallery-sections-manager";
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
import { enrichMediaWithUrls } from "@/lib/media";
import { cn, formatBytes, formatDate, statusBadgeClass } from "@/lib/utils";

function activityLabel(action: string) {
  switch (action) {
    case "media_hidden":
      return "Media hidden";
    case "media_unhidden":
      return "Media unhidden";
    case "media_soft_deleted":
      return "Moved to deleted";
    case "media_restored":
      return "Media restored";
    case "media_permanently_deleted":
      return "Deleted permanently";
    case "cover_set":
      return "Cover image set";
    case "cover_cleared":
      return "Cover image cleared";
    default:
      return action;
  }
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

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
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
          >
            Back to your events
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
                    Event date: {formatDate(event.event_date)}
                  </span>
                  <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">
                    Expires: {formatDate(event.expires_at)}
                  </span>
                  {isCouple && coupleUploadEndsAt ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">
                      Guest uploads until: {formatDate(coupleUploadEndsAt)}
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

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Media files</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{analytics.mediaCount}</p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Guest uploads</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{analytics.guestUploads}</p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Storage used</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                      {formatBytes(analytics.storageUsedBytes)}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--color-paper)]/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Downloads</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{analytics.downloadCount}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-black/10 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Guest upload link</p>
                    <p className="mt-3 break-all text-sm text-[var(--color-ink)]">{links.uploadUrl}</p>
                  </div>
                  <div className="rounded-[24px] border border-black/10 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                      {isCouple ? "Private gallery link" : "Client gallery link"}
                    </p>
                    <p className="mt-3 break-all text-sm text-[var(--color-ink)]">{links.galleryUrl}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-dashed border-black/10 bg-[var(--color-paper)]/45 px-4 py-3 text-sm leading-6 text-black/62">
                  These public links are permanent for this event. Renaming the event updates the display name only, so
                  existing shares and printed QR cards continue to work.
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={links.uploadUrl}
                    className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isCouple ? "Open guest upload page" : "Open guest page"}
                  </Link>
                  <Link
                    href={links.galleryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    {isCouple ? "Open private gallery" : "Open client gallery"}
                  </Link>
                </div>

                {expired ? (
                  <div className="rounded-[24px] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#8a1c1c]">
                    {isCouple
                      ? "This event is expired. Guest uploads and private gallery access are blocked until you extend the expiry date."
                      : "This event is expired. Guest uploads and client gallery access are blocked until you extend the expiry date."}
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
                      {isCouple
                        ? "Set a cover image to make your event easier to recognize at a glance."
                        : "Set a cover image from Gallery manager to make this event easier to recognize at a glance."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="min-w-0 bg-white/92">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Guest QR code</p>
            <div className="mt-4 rounded-[28px] bg-[var(--color-paper)] p-6">
              <Image
                src={qrCode}
                alt={`QR code for ${event.title}`}
                width={400}
                height={400}
                className="h-auto w-full rounded-[20px]"
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-black/58">
              Share this on tables, invites, or signage so guests can upload without installing an app.
            </p>
            <div className="mt-6 border-t border-black/8 pt-6">
              <QrPosterPicker
                slug={event.slug}
                qrCodeDataUrl={qrCode}
                eventTitle={event.title || "Confetti"}
                eventDate={event.event_date ? formatDate(event.event_date) : null}
              />
            </div>
          </Panel>
        </div>

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? "Upload your gallery files" : "Upload the pro gallery"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple
              ? "Files upload directly to private storage, then appear in your gallery after confirmation."
              : "Files upload directly to private object storage, then appear in the gallery after confirmation."}
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
          saved={resolvedSearchParams?.saved === "1"}
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
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Danger zone</h2>
            <p className="mt-2 text-sm leading-6 text-black/62">
              Permanently deletes this event and all associated files from storage. This cannot be undone.
            </p>
            <div className="mt-5">
              <EventLifecyclePanel slug={event.slug} />
            </div>
          </Panel>
        ) : null}

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? "Organize your private gallery" : "Gallery sections"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple
              ? "Create simple sections like Ceremony, Restaurant, or Photoshoot, then assign files from your gallery."
              : "Create simple sections like Ceremony, Restaurant, or Photoshoot, then assign files from Gallery manager."}
          </p>
          <div className="mt-5">
            <GallerySectionsManager slug={event.slug} sections={sections} />
          </div>
        </Panel>

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? "Manage your gallery" : "Gallery manager"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple
              ? "Review guest uploads, hide or unhide items, pick a cover image, and download the files you want to keep."
              : "Review guest uploads, hide or unhide items, pick a cover image, and download selected assets."}
          </p>
          <div className="mt-5">
            <MediaGrid
              media={media}
              ownerMode
              eventSlug={event.slug}
              coverImageId={event.cover_image_id}
              audience={accountType}
              sections={sections}
            />
          </div>
        </Panel>

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? "Recent changes" : "Recent activity"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {isCouple
              ? "A quick timeline of gallery changes, moderation, and cover updates on this event."
              : "A quick audit trail for gallery moderation and cover changes on this event."}
          </p>

          {activity.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-black/10 bg-white/70 px-6 py-10 text-center text-sm text-black/58">
              No activity recorded yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-[24px] border border-black/10 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{activityLabel(item.action)}</p>
                    <p className="mt-1 text-sm text-black/58">
                      {typeof item.metadata?.filename === "string" ? item.metadata.filename : "Event action"}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/45">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}
