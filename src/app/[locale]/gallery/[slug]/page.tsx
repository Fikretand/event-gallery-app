import { Instrument_Sans } from "next/font/google";
import { notFound } from "next/navigation";

import { GalleryUnlockForm } from "@/app/gallery/[slug]/gallery-unlock-form";
import { ClosedScreen, PinScreen } from "@/components/gallery/gallery-screens";
import { GuestGallery, type GuestMedia } from "@/components/gallery/guest-gallery";
import { unlockGalleryAction } from "@/lib/actions";
import {
  canViewGallery,
  getEventCoverMap,
  getPublicEventBySlug,
  isEventExpired,
  listEventMedia,
  listGallerySections,
} from "@/lib/events";
import { applyCustomCopy, customTitle } from "@/lib/custom-copy";
import { enrichMediaWithUrls } from "@/lib/media";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { cn, formatDate } from "@/lib/utils";

// The guest gallery's face in the "Otisak" brand: warmer and narrower than the
// site's Inter. Only this route loads it.
const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-gallery",
  display: "swap",
});

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const lang: Locale = locale === "en" ? "en" : "bs";

  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  // The owner's own wording, where they wrote any, over the standard text.
  const dict = applyCustomCopy(getDictionary(lang), event.custom_copy);
  const d = dict.gallery;
  const g = dict.guestGallery;
  const title = customTitle(event.custom_copy, "event.galleryTitle", event.title);
  const dateLabel = event.event_date ? formatDate(event.event_date.slice(0, 10), lang) : null;

  const coverMap = await getEventCoverMap([event]);
  const coverMedia = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;
  const coverSrc = coverMedia ? (coverMedia.previewUrl ?? coverMedia.thumbnailUrl) : null;
  const cover = coverSrc
    ? {
        src: coverSrc,
        // The print keeps the photo's own shape, within a sane range.
        ratio:
          coverMedia?.width && coverMedia?.height
            ? Math.min(1.5, Math.max(0.66, coverMedia.width / coverMedia.height))
            : 4 / 5,
      }
    : null;

  const root = cn(instrumentSans.variable, "gallery-otisak min-h-dvh bg-paper text-ink");

  // Closed galleries: the title, why, and who can help. Nothing to do here.
  if (event.status === "archived" || isEventExpired(event)) {
    return (
      <main className={root}>
        <ClosedScreen
          title={title}
          dateLabel={dateLabel}
          reason={event.status === "archived" ? d.archived : d.expired}
          hint={g.closedHint}
        />
      </main>
    );
  }

  const hasAccess = await canViewGallery(event);
  if (!hasAccess) {
    return (
      <main className={cn(root, "bg-paper-2")}>
        <PinScreen
          title={title}
          dateLabel={dateLabel}
          cover={cover}
          privateLabel={d.privateGallery}
          enterPin={d.enterPin}
          form={
            <GalleryUnlockForm
              action={unlockGalleryAction.bind(null, slug, locale)}
              strings={{ ...dict.galleryUnlock, retryIn: g.retryIn }}
            />
          }
        />
      </main>
    );
  }

  const [media, sections] = await Promise.all([
    listEventMedia(event.id, { includeHidden: false, sourceType: "all", sortOrder: "asc" }).then(
      enrichMediaWithUrls,
    ),
    listGallerySections(event.id),
  ]);

  // Only what the page draws goes to the browser: no storage keys, no guest
  // emails. A guest's name travels only with their own video message.
  const items: GuestMedia[] = media
    .filter((item) => !item.deleted_at && !item.hidden_at)
    .map((item) => {
      const message = item.purpose === "message";
      return {
        id: item.id,
        video: item.mime_type.startsWith("video/"),
        message,
        width: item.width,
        height: item.height,
        duration: item.duration_seconds,
        thumb: item.thumbnailUrl,
        preview: item.previewUrl,
        source: item.source_type === "guest" ? "guest" : "photographer",
        sectionId: item.section_id,
        size: item.size_bytes,
        from: message ? (item.guest_name ?? null) : null,
      };
    });

  return (
    <main className={root}>
      <GuestGallery
        locale={lang}
        title={title}
        dateLabel={dateLabel}
        cover={cover}
        media={items}
        sections={sections.map((section) => ({ id: section.id, name: section.name }))}
        fontClassName={instrumentSans.variable}
        strings={{ gallery: d, viewer: dict.galleryViewer, g }}
      />
    </main>
  );
}
