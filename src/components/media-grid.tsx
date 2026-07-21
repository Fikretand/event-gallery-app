"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { t, type Dict } from "@/lib/i18n/index";
import type { AccountType, GallerySectionRecord, MediaView } from "@/lib/types";
import { cn, formatBytes, formatDaysUntilPurge } from "@/lib/utils";

type Filter = "all" | "photos" | "videos" | "photographer" | "guest" | "deleted";

type ViewerStrings = Dict["galleryViewer"];

// English fallback — dashboard/owner usages render without a `strings` prop and
// stay English; the public gallery passes the visitor's localized dictionary.
const DEFAULT_VIEWER_STRINGS: ViewerStrings = {
  filterAll: "All",
  filterPhotos: "Photos",
  filterVideos: "Videos",
  filterPhotographer: "Photographer",
  filterGuest: "Guests",
  downloadAllZip: "Download all · ZIP ({{count}})",
  downloadSelectedZip: "Download {{count}} · ZIP",
  downloadSelected: "Download selected",
  select: "Select",
  download: "Download",
  cover: "Cover",
  byGuest: "by {{name}}",
  emptyTitle: "Nothing to show here yet",
  emptyBody: "The photographer hasn't shared anything in this view yet — check back soon.",
  swipeHint: "Swipe to browse",
  sectionEyebrow: "Section",
  moreMoments: "More moments",
  everythingElse: "Everything else",
  close: "Close",
  previous: "Previous",
  next: "Next",
  downloadFailed: "Download failed. Please try again.",
  zipFailed: "ZIP download failed. Please try again.",
};

type OwnerStrings = Dict["dashboard"]["mediaOwner"];

// English fallback for owner-mode moderation labels (public gallery never
// renders these; the dashboard passes the localized dictionary).
const DEFAULT_OWNER_STRINGS: OwnerStrings = {
  hidden: "Hidden",
  deleted: "Deleted",
  deletedAutoPurge: "Deleted files auto-purge after 7 days",
  sectionLabel: "Section",
  unsectioned: "Unsectioned",
  clearCover: "Clear cover",
  setCover: "Set as cover",
  unhide: "Unhide",
  hide: "Hide",
  delete: "Delete",
  restore: "Restore",
  deletePermanently: "Delete permanently",
  deleteConfirm: "Remove this file from the gallery? You can restore it for 7 days.",
  permanentDeleteConfirm: "Permanently delete this file from storage? This cannot be undone.",
  emptyDeletedTitle: "No deleted files right now",
  emptyDeletedBody: "Files you soft delete will stay here for 7 days before permanent cleanup.",
  emptyAllTitle: "No media in this gallery yet",
  emptyBodyPhotographer: "Upload the pro gallery or review incoming guest files to start building the event story.",
  emptyBodyCouple: "Upload your gallery files or review guest uploads to start building the full event story.",
  emptyFilterTitle: "No {{filter}} files in this view yet",
};

const SWIPE_THRESHOLD = 48;

export function MediaGrid({
  media,
  ownerMode,
  eventSlug,
  coverImageId,
  audience = "photographer",
  sections = [],
  strings = DEFAULT_VIEWER_STRINGS,
  ownerStrings = DEFAULT_OWNER_STRINGS,
}: {
  media: MediaView[];
  ownerMode?: boolean;
  eventSlug?: string;
  coverImageId?: string | null;
  audience?: AccountType;
  sections?: GallerySectionRecord[];
  strings?: ViewerStrings;
  ownerStrings?: OwnerStrings;
}) {
  const vs = strings;
  const os = ownerStrings;
  const filterLabel = (value: Filter) =>
    value === "all"
      ? vs.filterAll
      : value === "photos"
        ? vs.filterPhotos
        : value === "videos"
          ? vs.filterVideos
          : value === "photographer"
            ? vs.filterPhotographer
            : value === "guest"
              ? vs.filterGuest
              : "Deleted";
  const sourceLabel = (source: string) =>
    source === "guest" ? vs.filterGuest : vs.filterPhotographer;
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  const filterOptions = ownerMode
    ? (["all", "photos", "videos", "photographer", "guest", "deleted"] as const)
    : (["all", "photos", "videos", "photographer", "guest"] as const);

  const visibleItems = useMemo(
    () =>
      media.filter((item) => {
        if (filter === "deleted") {
          return Boolean(item.deleted_at);
        }

        if (item.deleted_at) {
          return false;
        }

        if (filter === "photos") {
          return item.mime_type.startsWith("image/");
        }

        if (filter === "videos") {
          return item.mime_type.startsWith("video/");
        }

        return filter === "all" || item.source_type === filter;
      }),
    [filter, media],
  );

  const visibleSections = useMemo(() => {
    const sectionIds = new Set(visibleItems.map((item) => item.section_id).filter((value): value is string => Boolean(value)));
    return sections.filter((section) => sectionIds.has(section.id));
  }, [sections, visibleItems]);

  const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? visibleItems[activeIndex] : null;
  const selectedVisibleIds = useMemo(
    () => selected.filter((id) => visibleItems.some((item) => item.id === id)),
    [selected, visibleItems],
  );

  useEffect(() => {
    if (!activeItem) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveId(null);
      }

      if (event.key === "ArrowLeft" && activeIndex > 0) {
        setActiveId(visibleItems[activeIndex - 1]?.id ?? null);
      }

      if (event.key === "ArrowRight" && activeIndex < visibleItems.length - 1) {
        setActiveId(visibleItems[activeIndex + 1]?.id ?? null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeItem, activeIndex, visibleItems]);

  // Lock background scroll while the full-screen viewer is open.
  useEffect(() => {
    if (!activeId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeId]);

  function showPrevious() {
    if (activeIndex <= 0) {
      return;
    }

    setActiveId(visibleItems[activeIndex - 1]?.id ?? null);
  }

  function showNext() {
    if (activeIndex < 0 || activeIndex >= visibleItems.length - 1) {
      return;
    }

    setActiveId(visibleItems[activeIndex + 1]?.id ?? null);
  }

  function resetTouch() {
    setTouchStartX(null);
    setTouchCurrentX(null);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
    setTouchCurrentX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    setTouchCurrentX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd() {
    if (touchStartX === null || touchCurrentX === null) {
      resetTouch();
      return;
    }

    const deltaX = touchCurrentX - touchStartX;

    if (deltaX >= SWIPE_THRESHOLD) {
      showPrevious();
    } else if (deltaX <= -SWIPE_THRESHOLD) {
      showNext();
    }

    resetTouch();
  }

  async function handleDownload(ids: string[]) {
    setError(null);

    if (ids.length > 1) {
      const response = await fetch("/api/media/download-batch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? vs.zipFailed);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename=\"([^\"]+)\"/);
      const filename = filenameMatch?.[1] ?? "gallery-download.zip";
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      return;
    }

    for (const id of ids) {
      const response = await fetch(`/api/media/${id}/download`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? vs.downloadFailed);
        return;
      }

      const link = document.createElement("a");
      link.href = payload.url;
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/media/${id}/toggle-hidden`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hidden }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to update visibility.");
    } else {
      window.location.reload();
    }

    setBusyId(null);
  }

  async function deleteMedia(id: string) {
    const confirmed = window.confirm(os.deleteConfirm);
    if (!confirmed) {
      return;
    }

    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/media/${id}/delete`, { method: "POST" });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to delete media.");
    } else {
      window.location.reload();
    }

    setBusyId(null);
  }

  async function restoreMedia(id: string) {
    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/media/${id}/restore`, { method: "POST" });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to restore media.");
    } else {
      window.location.reload();
    }

    setBusyId(null);
  }

  async function permanentlyDeleteMedia(id: string) {
    const confirmed = window.confirm(os.permanentDeleteConfirm);
    if (!confirmed) {
      return;
    }

    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/media/${id}/permanent-delete`, { method: "POST" });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to permanently delete media.");
    } else {
      window.location.reload();
    }

    setBusyId(null);
  }

  async function updateCoverImage(id: string | null) {
    if (!eventSlug) {
      return;
    }

    setBusyId(id ?? "cover");
    setError(null);

    const response = await fetch(`/api/events/${eventSlug}/cover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coverImageId: id }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to update event cover.");
    } else {
      window.location.reload();
    }

    setBusyId(null);
  }

  async function updateMediaSection(id: string, sectionId: string) {
    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/media/${id}/section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sectionId: sectionId || null }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to update gallery section.");
    } else {
      window.location.reload();
    }

    setBusyId(null);
  }

  const emptyTitle = !ownerMode
    ? vs.emptyTitle
    : filter === "deleted"
      ? os.emptyDeletedTitle
      : filter === "all"
        ? os.emptyAllTitle
        : t(os.emptyFilterTitle, { filter: filterLabel(filter).toLowerCase() });
  const emptyCopy = !ownerMode
    ? vs.emptyBody
    : filter === "deleted"
      ? os.emptyDeletedBody
      : audience === "couple"
        ? os.emptyBodyCouple
        : os.emptyBodyPhotographer;

  const shouldGroupBySection = !ownerMode && filter !== "deleted" && visibleSections.length > 0;

  return (
    <div className="space-y-5">
      {/* Filter bar — always visible so you can switch tabs even when the active filter returns 0 results */}
      <div className="sticky top-3 z-20 -mx-1 sm:top-4">
        <div className="rounded-[26px] border border-black/10 bg-white/88 px-3 py-3 shadow-[0_18px_36px_rgba(18,24,38,0.08)] backdrop-blur md:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex min-w-max gap-2">
                {filterOptions.map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition whitespace-nowrap",
                      filter === value
                        ? "bg-[var(--color-ink)] text-white shadow-[0_8px_20px_rgba(18,24,38,0.12)]"
                        : "border border-black/10 bg-white text-[var(--color-ink)] hover:bg-[var(--color-paper)]",
                    )}
                  >
                    {filterLabel(value)}
                  </button>
                ))}
              </div>
            </div>

            {visibleItems.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                {filter === "deleted" ? (
                  <div className="rounded-full border border-dashed border-black/10 bg-[var(--color-paper)]/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
                    {os.deletedAutoPurge}
                  </div>
                ) : null}
                {visibleItems.length > 1 ? (
                  <Button variant="ghost" className="w-full sm:w-auto" onClick={() => handleDownload(visibleItems.map((item) => item.id))}>
                    {t(vs.downloadAllZip, { count: visibleItems.length })}
                  </Button>
                ) : null}
                <Button
                  variant={selectedVisibleIds.length > 0 ? "secondary" : "ghost"}
                  className={cn(
                    "w-full sm:w-auto",
                    selectedVisibleIds.length === 0 && "pointer-events-none opacity-0 sm:opacity-40",
                  )}
                  onClick={() => handleDownload(selectedVisibleIds)}
                  disabled={selectedVisibleIds.length === 0}
                  aria-hidden={selectedVisibleIds.length === 0}
                >
                  {selectedVisibleIds.length > 1
                    ? t(vs.downloadSelectedZip, { count: selectedVisibleIds.length })
                    : vs.downloadSelected}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{error}</div> : null}

      {visibleItems.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-black/10 bg-white/80 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-[var(--color-ink)]">{emptyTitle}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/58">{emptyCopy}</p>
        </div>
      ) : shouldGroupBySection ? (
        <div className="space-y-8">
          {visibleSections.map((section) => (
            <SectionGroup
              key={section.id}
              title={section.name}
              eyebrow={vs.sectionEyebrow}
              items={visibleItems.filter((item) => item.section_id === section.id)}
              renderCard={renderCard}
            />
          ))}
          {visibleItems.some((item) => !item.section_id) ? (
            <SectionGroup
              title={vs.everythingElse}
              eyebrow={vs.moreMoments}
              items={visibleItems.filter((item) => !item.section_id)}
              renderCard={renderCard}
            />
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "stagger-children grid gap-3 sm:gap-4",
            ownerMode ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 lg:grid-cols-3",
          )}
        >
          {visibleItems.map((item) => renderCard(item))}
        </div>
      )}

      {activeItem && typeof document !== "undefined"
        ? createPortal(
        // Rendered into <body> via a portal: any ancestor with backdrop-blur /
        // transform (e.g. the surrounding Panel) would otherwise become the
        // containing block for this fixed element, sizing it to the panel
        // instead of the screen — which forced the image to overflow + scroll.
        <div
          className="lightbox-backdrop-in fixed inset-0 z-[100] flex h-[100dvh] w-screen items-center justify-center bg-[var(--backdrop-lightbox)] p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setActiveId(null)}
        >
          <div
            className="lightbox-panel-in mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-[var(--color-viewer-surface)] text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                {ownerMode ? (
                  <p className="truncate text-sm font-semibold">{activeItem.original_filename}</p>
                ) : (
                  <p className="text-sm font-semibold tabular-nums">
                    {activeIndex + 1}
                    <span className="text-white/45"> / {visibleItems.length}</span>
                  </p>
                )}
                <p className="truncate text-xs uppercase tracking-[0.18em] text-white/55">
                  {activeItem.deleted_at ? "deleted" : sourceLabel(activeItem.source_type)}
                  {!activeItem.deleted_at && activeItem.source_type === "guest" && (activeItem.guest_name ?? activeItem.guest_email)
                    ? ` · ${t(vs.byGuest, { name: activeItem.guest_name ?? activeItem.guest_email ?? "" })}`
                    : ""}
                  {ownerMode ? ` · ${activeIndex + 1} / ${visibleItems.length}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  className="hidden sm:inline-flex"
                  onClick={() => handleDownload([activeItem.id])}
                >
                  {vs.download}
                </Button>
                {/* Compact icon download on mobile */}
                <button
                  onClick={() => handleDownload([activeItem.id])}
                  aria-label={vs.download}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 transition hover:border-white/25 hover:bg-[var(--color-moss)] sm:hidden"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v10m0 0 4-4m-4 4-4-4M4 16h12" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveId(null)}
                  aria-label={vs.close}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 transition hover:border-white/25 hover:bg-[var(--color-accent)]"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="m3.5 3.5 9 9M12.5 3.5l-9 9" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--color-viewer-surface)]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Soft blurred echo of the current photo carries the atmosphere behind the contained image */}
              {!activeItem.mime_type.startsWith("video/") && (activeItem.thumbnailUrl ?? activeItem.previewUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`backdrop-${activeItem.id}`}
                  src={activeItem.thumbnailUrl ?? activeItem.previewUrl ?? undefined}
                  alt=""
                  aria-hidden="true"
                  className="lightbox-media-in pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl saturate-[1.15]"
                />
              ) : null}

              {activeIndex > 0 ? (
                <button
                  onClick={showPrevious}
                  aria-label={vs.previous}
                  className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[var(--color-ink)]/55 text-white backdrop-blur transition hover:border-white/25 hover:bg-[var(--color-moss)] sm:left-4"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                </button>
              ) : null}

              <div key={activeItem.id} className="lightbox-media-in relative flex h-full min-h-0 w-full items-center justify-center">
                {activeItem.mime_type.startsWith("video/") ? (
                  <video src={activeItem.previewUrl ?? undefined} controls className="max-h-full w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeItem.previewUrl ?? undefined}
                    alt={activeItem.original_filename}
                    className="max-h-full w-auto max-w-full select-none object-contain"
                  />
                )}
              </div>

              {activeIndex < visibleItems.length - 1 ? (
                <button
                  onClick={showNext}
                  aria-label={vs.next}
                  className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[var(--color-ink)]/55 text-white backdrop-blur transition hover:border-white/25 hover:bg-[var(--color-moss)] sm:right-4"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 3 5 5-5 5" />
                  </svg>
                </button>
              ) : null}

              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/12 bg-[var(--color-ink)]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur sm:hidden">
                {vs.swipeHint}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </div>
  );

  function renderCard(item: MediaView) {
    const isVideo = item.mime_type.startsWith("video/");
    const checked = selectedVisibleIds.includes(item.id);
    const isCover = coverImageId === item.id;
    const isDeleted = Boolean(item.deleted_at);
    const purgeMessage = formatDaysUntilPurge(item.deleted_at);
    const guestName = item.guest_name ?? item.guest_email;

    // ── Public gallery: a clean photo tile — image fills the card, select +
    //    download live as unobtrusive overlays, no technical filename chrome. ──
    if (!ownerMode) {
      return (
        <article
          key={item.id}
          className="lift-card group relative overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(18,24,38,0.05)]"
        >
          <button
            className="relative block aspect-[4/5] w-full overflow-hidden"
            onClick={() => setActiveId(item.id)}
            aria-label={item.original_filename}
          >
            {isVideo && !item.thumbnail_key ? (
              <video
                className="h-full w-full bg-[var(--color-viewer-surface)] object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                src={item.previewUrl ?? undefined}
                muted
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnailUrl ?? item.previewUrl ?? undefined}
                alt={item.original_filename}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
              />
            )}
            {/* Legibility wash for overlays */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {isVideo ? (
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            ) : null}
            {isCover ? (
              <span className="absolute right-2 top-2 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm">
                {vs.cover}
              </span>
            ) : null}
            {guestName ? (
              <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white/90 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                {t(vs.byGuest, { name: guestName })}
              </span>
            ) : null}
          </button>

          {/* Select toggle */}
          <label
            className={cn(
              "absolute left-2 top-2 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition",
              checked
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-white/70 bg-white/60 text-transparent hover:bg-white/85",
            )}
            title={vs.select}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id),
                )
              }
            />
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
          </label>

          {/* Download */}
          <button
            onClick={() => handleDownload([item.id])}
            aria-label={vs.download}
            title={vs.download}
            className="absolute bottom-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white/85 text-[var(--color-ink)] shadow-sm backdrop-blur transition hover:bg-white"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v10m0 0 4-4m-4 4-4-4M4 16h12" />
            </svg>
          </button>
        </article>
      );
    }

    return (
      <article
        key={item.id}
        className="lift-card group overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(18,24,38,0.05)]"
      >
        <button className="relative block w-full overflow-hidden text-left" onClick={() => setActiveId(item.id)}>
          {isVideo && !item.thumbnail_key ? (
            <video
              className="h-64 w-full bg-[var(--color-viewer-surface)] object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              src={item.previewUrl ?? undefined}
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl ?? item.previewUrl ?? undefined}
              alt={item.original_filename}
              className={cn(
                "h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]",
                isDeleted && "opacity-70 grayscale-[0.2]",
              )}
            />
          )}
          {item.hidden_at && !isDeleted ? (
            <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {os.hidden}
            </span>
          ) : null}
          {isDeleted ? (
            <span className="absolute left-4 top-4 rounded-full bg-[#8a1c1c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {os.deleted}
            </span>
          ) : null}
          {isCover ? (
            <span className="absolute right-4 top-4 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {vs.cover}
            </span>
          ) : null}
        </button>

        <div className="space-y-3 p-4">
          <div>
            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.original_filename}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">
              {isDeleted ? os.deleted : sourceLabel(item.source_type)} · {formatBytes(item.size_bytes)}
            </p>
            {!isDeleted && item.source_type === "guest" && guestName ? (
              <p className="mt-1 text-xs font-medium text-[var(--color-moss)]">
                {t(vs.byGuest, { name: guestName })}
              </p>
            ) : null}
            {isDeleted && purgeMessage ? <p className="mt-2 text-xs text-[#8a1c1c]">{purgeMessage}</p> : null}
          </div>

          {ownerMode && sections.length > 0 && !isDeleted ? (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
              <span>{os.sectionLabel}</span>
              <select
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--color-ink)]"
                value={item.section_id ?? ""}
                onChange={(event) => updateMediaSection(item.id, event.target.value)}
                disabled={busyId === item.id}
              >
                <option value="">{os.unsectioned}</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id),
                  )
                }
              />
              {vs.select}
            </label>

            <Button variant="secondary" onClick={() => handleDownload([item.id])}>
              {vs.download}
            </Button>

            {ownerMode ? (
              <>
                {!isVideo && !isDeleted ? (
                  <Button
                    variant={isCover ? "ghost" : "secondary"}
                    onClick={() => updateCoverImage(isCover ? null : item.id)}
                    disabled={busyId === item.id || busyId === "cover"}
                  >
                    {isCover ? os.clearCover : os.setCover}
                  </Button>
                ) : null}

                {!isDeleted ? (
                  <>
                    <Button
                      variant={item.hidden_at ? "secondary" : "ghost"}
                      onClick={() => toggleHidden(item.id, !item.hidden_at)}
                      disabled={busyId === item.id}
                    >
                      {item.hidden_at ? os.unhide : os.hide}
                    </Button>

                    <Button variant="danger" onClick={() => deleteMedia(item.id)} disabled={busyId === item.id}>
                      {os.delete}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => restoreMedia(item.id)} disabled={busyId === item.id}>
                      {os.restore}
                    </Button>
                    <Button variant="danger" onClick={() => permanentlyDeleteMedia(item.id)} disabled={busyId === item.id}>
                      {os.deletePermanently}
                    </Button>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </article>
    );
  }
}

function SectionGroup({
  title,
  items,
  renderCard,
  eyebrow = "Section",
}: {
  title: string;
  items: MediaView[];
  renderCard: (item: MediaView) => React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">{eyebrow}</p>
        <h3 className="font-display mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
      </div>
      <div className="stagger-children grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{items.map((item) => renderCard(item))}</div>
    </div>
  );
}
