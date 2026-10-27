import { notFound } from "next/navigation";

import { GalleryUnlockForm } from "@/app/gallery/[slug]/gallery-unlock-form";
import { MediaGrid } from "@/components/media-grid";
import { LockIcon } from "@/components/ui/icons";
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
import { getDictionary, t, type Locale } from "@/lib/i18n/index";
import { formatDate } from "@/lib/utils";

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
  const du = dict.galleryUnlock;
  const title = customTitle(event.custom_copy, "event.galleryTitle", event.title);

  const coverMap = await getEventCoverMap([event]);
  const cover = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;

  const header = (
    <header className="shell pt-[var(--space-lg)]">
      <span className="font-display text-[1.375rem] font-semibold text-ink">Confetti</span>
    </header>
  );

  const facts = (extra?: React.ReactNode) => (
    <ul className="mt-[var(--space-md)] flex flex-wrap gap-2">
      {event.client_name ? <li className="chip">{event.client_name}</li> : null}
      {event.event_date ? <li className="chip">{formatDate(event.event_date.slice(0, 10), lang)}</li> : null}
      {extra}
    </ul>
  );

  // Closed galleries: the title and why, nothing else to do here.
  if (event.status === "archived" || isEventExpired(event)) {
    return (
      <main className="min-h-dvh">
        {header}
        <section className="shell py-[var(--space-3xl)]">
          <h1 className="display-s max-w-[20ch] text-ink">{title}</h1>
          <p role="status" className="notice notice-error mt-[var(--space-lg)] max-w-xl text-[0.9375rem]">
            {event.status === "archived" ? d.archived : d.expired}
          </p>
        </section>
      </main>
    );
  }

  const hasAccess = await canViewGallery(event);
  if (!hasAccess) {
    return (
      <main className="min-h-dvh">
        {header}
        {/* Without a cover photo the form stands alone: an empty frame took
            half a phone screen and pushed the PIN field out of sight. */}
        <section
          className={
            cover
              ? "shell grid gap-y-[var(--space-xl)] py-[var(--space-2xl)] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--gap-columns)]"
              : "shell py-[var(--space-2xl)]"
          }
        >
          {cover ? (
            <div className="lg:col-span-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
                alt=""
                className="aspect-[4/5] max-h-[70svh] w-full rounded-[var(--radius-image)] bg-paper-3 object-cover"
              />
            </div>
          ) : null}

          <div className={cover ? "max-w-md lg:col-span-6 lg:col-start-7" : "max-w-md"}>
            <h1 className="display-s text-ink">{title}</h1>
            {facts(
              <li className="chip chip-moss">
                <LockIcon className="h-3.5 w-3.5" />
                {d.privateGallery}
              </li>,
            )}
            <p className="mt-[var(--space-lg)] text-ink-2">{d.enterPin}</p>
            <div className="mt-[var(--space-md)]">
              <GalleryUnlockForm action={unlockGalleryAction.bind(null, slug, locale)} strings={du} />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [media, sections] = await Promise.all([
    listEventMedia(event.id, { includeHidden: false, sourceType: "all", sortOrder: "asc" }).then(
      enrichMediaWithUrls,
    ),
    listGallerySections(event.id),
  ]);

  return (
    <main className="min-h-dvh pb-[var(--space-3xl)]">
      {header}
      <section
        className={
          cover
            ? "shell grid gap-y-[var(--space-lg)] py-[var(--space-xl)] lg:grid-cols-12 lg:items-end lg:gap-x-[var(--gap-columns)]"
            : "shell py-[var(--space-xl)]"
        }
      >
        <div className="lg:col-span-6">
          <h1 className="display-s max-w-[18ch] text-ink">{title}</h1>
          <p className="mt-[var(--space-md)] max-w-[52ch] text-ink-2">{d.browseCurated}</p>
          {facts(<li className="chip chip-moss">{t(d.visibleFiles, { count: media.length })}</li>)}
        </div>

        {/* No cover, no frame: the placeholder only repeated the text beside it. */}
        {cover ? (
          <div className="lg:col-span-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
              alt=""
              className="aspect-[16/10] w-full rounded-[var(--radius-image)] bg-paper-3 object-cover"
            />
          </div>
        ) : null}
      </section>

      <section className="shell">
        <MediaGrid media={media} sections={sections} strings={dict.galleryViewer} />
      </section>
    </main>
  );
}
