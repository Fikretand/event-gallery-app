import { notFound } from "next/navigation";

import { GalleryUnlockForm } from "@/app/gallery/[slug]/gallery-unlock-form";
import { MediaGrid } from "@/components/media-grid";
import { Panel } from "@/components/ui/panel";
import { unlockGalleryAction } from "@/lib/actions";
import { canViewGallery, getEventCoverMap, getPublicEventBySlug, isEventExpired, listEventMedia, listGallerySections } from "@/lib/events";
import { enrichMediaWithUrls } from "@/lib/media";
import { formatDate } from "@/lib/utils";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const coverMap = await getEventCoverMap([event]);
  const cover = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;

  if (event.status === "archived") {
    return (
      <main className="py-10">
        <section className="shell">
          <Panel className="bg-white/94">
            <h1 className="text-3xl font-semibold text-[var(--color-ink)]">{event.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#8a1c1c]">
              This gallery is archived in cold storage and becomes available again after the photographer restores it.
            </p>
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
            <h1 className="text-3xl font-semibold text-[var(--color-ink)]">{event.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#8a1c1c]">This gallery has expired and is no longer available.</p>
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
                  <div className="flex aspect-[4/5] h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-8 text-center text-sm leading-6 text-black/45">
                    This private gallery opens after the correct PIN is entered.
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Private gallery</p>
                <h1 className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{event.title}</h1>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  Enter the gallery PIN to view the client-ready delivery set and any approved guest uploads.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-black/45">
                  {event.client_name ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">{event.client_name}</span>
                  ) : null}
                  {event.event_date ? (
                    <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">{formatDate(event.event_date)}</span>
                  ) : null}
                </div>
                <div className="mt-6">
                  <GalleryUnlockForm action={unlockGalleryAction.bind(null, slug, event)} />
                </div>
              </div>
            </div>
          </Panel>
        </section>
      </main>
    );
  }

  const [media, sections] = await Promise.all([
    listEventMedia(event.id, { includeHidden: false, sourceType: "all", sortOrder: "asc" }).then(enrichMediaWithUrls),
    listGallerySections(event.id),
  ]);

  return (
    <main className="py-10">
      <section className="shell space-y-6">
        <Panel className="bg-white/94">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Client gallery</p>
              <h1 className="text-4xl font-semibold text-[var(--color-ink)]">{event.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-black/62">
                Browse the approved pro gallery and any guest moments the photographer has chosen to keep visible.
              </p>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-black/45">
                {event.client_name ? (
                  <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">{event.client_name}</span>
                ) : null}
                {event.event_date ? (
                  <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">{formatDate(event.event_date)}</span>
                ) : null}
                <span className="rounded-full bg-[var(--color-paper)] px-3 py-2">{media.length} visible files</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.previewUrl ?? cover.thumbnailUrl ?? undefined}
                  alt={`${event.title} cover`}
                  className="aspect-[16/10] h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-8 text-center text-sm leading-6 text-black/45">
                  Private event delivery, curated and approved by the photographer.
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="bg-white/94">
          <MediaGrid media={media} sections={sections} />
        </Panel>
      </section>
    </main>
  );
}
