import { notFound } from "next/navigation";

import { GalleryUnlockForm } from "@/app/gallery/[slug]/gallery-unlock-form";
import { MediaGrid } from "@/components/media-grid";
import { Panel } from "@/components/ui/panel";
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

  if (event.status === "archived") {
    return (
      <main className="py-10">
        <section className="shell">
          <Panel className="bg-card">
            <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-error)]">{d.archived}</p>
          </Panel>
        </section>
      </main>
    );
  }

  if (isEventExpired(event)) {
    return (
      <main className="py-10">
        <section className="shell">
          <Panel className="bg-card">
            <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-error)]">{d.expired}</p>
          </Panel>
        </section>
      </main>
    );
  }

  const hasAccess = await canViewGallery(event);
  if (!hasAccess) {
    return (
      <main className="py-10">
        <section className="shell">
          {/* Without a cover photo the form stands alone: an empty frame took
              half a phone screen and pushed the PIN field out of sight. */}
          <Panel className={cover ? "mx-auto max-w-4xl bg-card" : "mx-auto max-w-lg bg-card"}>
            <div className={cover ? "grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" : "grid"}>
              {cover ? (
                <div className="overflow-hidden rounded-[28px] border border-rule bg-[var(--color-paper)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
                    alt={title}
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold text-[var(--color-moss)]">
                  {d.privateGallery}
                </p>
                <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--color-ink)]">
                  {title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-ink-2">{d.enterPin}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-2">
                  {event.client_name ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                      {event.client_name}
                    </span>
                  ) : null}
                  {event.event_date ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                      {formatDate(event.event_date.slice(0, 10), lang)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-6">
                  <GalleryUnlockForm
                    action={unlockGalleryAction.bind(null, slug, locale)}
                    strings={du}
                  />
                </div>
              </div>
            </div>
          </Panel>
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
    <main className="py-6 sm:py-10">
      <section className="shell space-y-4 sm:space-y-6">
        <Panel className="bg-card p-5 sm:p-6">
          <div className={cover ? "grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center" : "grid"}>
            <div className="order-2 space-y-4 lg:order-1">
              <p className="text-xs font-semibold text-[var(--color-moss)] sm:text-sm">
                {d.clientGallery}
              </p>
              <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-ink-2 sm:text-base sm:leading-7">
                {d.browseCurated}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-ink-2">
                {event.client_name ? (
                  <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                    {event.client_name}
                  </span>
                ) : null}
                {event.event_date ? (
                  <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                    {formatDate(event.event_date.slice(0, 10), lang)}
                  </span>
                ) : null}
                <span className="rounded-full bg-[var(--color-moss)]/10 px-3 py-2 text-[var(--color-moss)]">
                  {t(d.visibleFiles, { count: media.length })}
                </span>
              </div>
            </div>

            {/* No cover, no frame: the placeholder only repeated the text beside it. */}
            {cover ? (
              <div className="order-1 overflow-hidden rounded-[24px] border border-rule bg-[var(--color-paper)] sm:rounded-[28px] lg:order-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
                  alt={title}
                  className="aspect-[16/10] h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="bg-card p-3 sm:p-6">
          <MediaGrid media={media} sections={sections} strings={dict.galleryViewer} />
        </Panel>
      </section>
    </main>
  );
}
