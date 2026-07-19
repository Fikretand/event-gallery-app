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
import { enrichMediaWithUrls } from "@/lib/media";
import { getDictionary, t, type Locale } from "@/lib/i18n/index";
import { formatDate } from "@/lib/utils";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.gallery;
  const du = dict.galleryUnlock;

  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const coverMap = await getEventCoverMap([event]);
  const cover = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;

  if (event.status === "archived") {
    return (
      <main className="py-10">
        <section className="shell">
          <Panel className="bg-white/94">
            <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">
              {event.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#8a1c1c]">{d.archived}</p>
          </Panel>
        </section>
      </main>
    );
  }

  if (isEventExpired(event)) {
    return (
      <main className="py-10">
        <section className="shell">
          <Panel className="bg-white/94">
            <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">
              {event.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#8a1c1c]">{d.expired}</p>
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
          <Panel className="mx-auto max-w-4xl bg-white/94">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
                    alt={`${event.title} cover`}
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-8 text-center text-sm leading-6 text-black/60">
                    {d.privateNoAccess}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
                  {d.privateGallery}
                </p>
                <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--color-ink)]">
                  {event.title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-black/62">{d.enterPin}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-black/60">
                  {event.client_name ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                      {event.client_name}
                    </span>
                  ) : null}
                  {event.event_date ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                      {formatDate(event.event_date)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-6">
                  <GalleryUnlockForm
                    action={unlockGalleryAction.bind(null, slug, event)}
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
        <Panel className="bg-white/94 p-5 sm:p-6">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="order-2 space-y-4 lg:order-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)] sm:text-sm">
                {d.clientGallery}
              </p>
              <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
                {event.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-black/62 sm:text-base sm:leading-7">
                {d.browseCurated}
              </p>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-black/60">
                {event.client_name ? (
                  <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                    {event.client_name}
                  </span>
                ) : null}
                {event.event_date ? (
                  <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">
                    {formatDate(event.event_date)}
                  </span>
                ) : null}
                <span className="rounded-full bg-[var(--color-moss)]/10 px-3 py-2 text-[var(--color-moss)]">
                  {t(d.visibleFiles, { count: media.length })}
                </span>
              </div>
            </div>

            <div className="order-1 overflow-hidden rounded-[24px] border border-black/10 bg-[var(--color-paper)] shadow-inner sm:rounded-[28px] lg:order-2">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
                  alt={`${event.title} cover`}
                  className="aspect-[16/10] h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-8 text-center text-sm leading-6 text-black/60">
                  {d.browseCurated}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="bg-white/94 p-3 sm:p-6">
          <MediaGrid media={media} sections={sections} strings={dict.galleryViewer} />
        </Panel>
      </section>
    </main>
  );
}
