"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AccountType, GallerySectionRecord, MediaView } from "@/lib/types";
import { cn, formatBytes, formatDaysUntilPurge } from "@/lib/utils";

type Filter = "all" | "photos" | "videos" | "photographer" | "guest" | "deleted";

const SWIPE_THRESHOLD = 48;

export function MediaGrid({
  media,
  ownerMode,
  eventSlug,
  coverImageId,
  audience = "photographer",
  sections = [],
}: {
  media: MediaView[];
  ownerMode?: boolean;
  eventSlug?: string;
  coverImageId?: string | null;
  audience?: AccountType;
  sections?: GallerySectionRecord[];
}) {
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
        setError(payload.error ?? "ZIP download failed.");
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
        setError(payload.error ?? "Download failed.");
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
    const confirmed = window.confirm("Remove this file from the gallery? You can restore it for 7 days.");
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
    const confirmed = window.confirm("Permanently delete this file from storage? This cannot be undone.");
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

  const emptyTitle =
    filter === "deleted"
      ? "No deleted files right now"
      : filter === "all"
        ? "No media in this gallery yet"
        : `No ${filter} files in this view yet`;
  const emptyCopy =
    filter === "deleted"
      ? "Files you soft delete will stay here for 7 days before permanent cleanup."
      : ownerMode
        ? audience === "couple"
          ? "Upload your gallery files or review guest uploads to start building the full event story."
          : "Upload the pro gallery or review incoming guest files to start building the event story."
        : "The photographer has not published any files in this section yet.";

  const shouldGroupBySection = !ownerMode && filter !== "deleted" && visibleSections.length > 0;

  return (
    <div className="space-y-5">
      {visibleItems.length > 0 ? (
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
                        "rounded-full px-4 py-2 text-sm font-semibold capitalize transition whitespace-nowrap",
                        filter === value
                          ? "bg-[var(--color-ink)] text-white"
                          : "border border-black/10 bg-white text-[var(--color-ink)] hover:bg-[var(--color-paper)]",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                {filter === "deleted" ? (
                  <div className="rounded-full border border-dashed border-black/10 bg-[var(--color-paper)]/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
                    Deleted files auto-purge after 7 days
                  </div>
                ) : null}
                {visibleItems.length > 1 ? (
                  <Button variant="ghost" className="w-full sm:w-auto" onClick={() => handleDownload(visibleItems.map((item) => item.id))}>
                    Download all as ZIP ({visibleItems.length})
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
                    ? `Download selected as ZIP (${selectedVisibleIds.length})`
                    : selectedVisibleIds.length === 1
                      ? "Download selected"
                      : "Download selected"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
              items={visibleItems.filter((item) => item.section_id === section.id)}
              renderCard={renderCard}
            />
          ))}
          {visibleItems.some((item) => !item.section_id) ? (
            <SectionGroup
              title="Everything else"
              eyebrow="More moments"
              items={visibleItems.filter((item) => !item.section_id)}
              renderCard={renderCard}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => renderCard(item))}
        </div>
      )}

      {activeItem ? (
        <div className="fixed inset-0 z-50 bg-black/84 p-3 sm:p-4" onClick={() => setActiveId(null)}>
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-[#10131d] text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activeItem.original_filename}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                  {activeItem.deleted_at ? "deleted" : activeItem.source_type} · {activeIndex + 1} / {visibleItems.length}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => handleDownload([activeItem.id])}>
                  Download
                </Button>
                <button
                  onClick={showPrevious}
                  disabled={activeIndex <= 0}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={showNext}
                  disabled={activeIndex >= visibleItems.length - 1}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
                <button
                  onClick={() => setActiveId(null)}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center bg-black"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {activeIndex > 0 ? (
                <button
                  onClick={showPrevious}
                  className="absolute left-3 z-10 rounded-full bg-black/55 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/75 sm:left-4"
                >
                  {"<"}
                </button>
              ) : null}

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

              {activeIndex < visibleItems.length - 1 ? (
                <button
                  onClick={showNext}
                  className="absolute right-3 z-10 rounded-full bg-black/55 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/75 sm:right-4"
                >
                  {">"}
                </button>
              ) : null}

              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 sm:hidden">
                Swipe to browse
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  function renderCard(item: MediaView) {
    const isVideo = item.mime_type.startsWith("video/");
    const checked = selectedVisibleIds.includes(item.id);
    const isCover = coverImageId === item.id;
    const isDeleted = Boolean(item.deleted_at);
    const purgeMessage = formatDaysUntilPurge(item.deleted_at);

    return (
      <article key={item.id} className="overflow-hidden rounded-[26px] border border-black/10 bg-white">
        <button className="relative block w-full text-left" onClick={() => setActiveId(item.id)}>
          {isVideo ? (
            <video className="h-64 w-full bg-black object-cover" src={item.previewUrl ?? undefined} muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl ?? item.previewUrl ?? undefined}
              alt={item.original_filename}
              className={cn("h-64 w-full object-cover", isDeleted && "opacity-70 grayscale-[0.2]")}
            />
          )}
          {item.hidden_at && !isDeleted ? (
            <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Hidden
            </span>
          ) : null}
          {isDeleted ? (
            <span className="absolute left-4 top-4 rounded-full bg-[#8a1c1c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Deleted
            </span>
          ) : null}
          {isCover ? (
            <span className="absolute right-4 top-4 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Cover
            </span>
          ) : null}
        </button>

        <div className="space-y-3 p-4">
          <div>
            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.original_filename}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">
              {isDeleted ? "deleted" : item.source_type} · {formatBytes(item.size_bytes)}
            </p>
            {isDeleted && purgeMessage ? <p className="mt-2 text-xs text-[#8a1c1c]">{purgeMessage}</p> : null}
          </div>

          {ownerMode && sections.length > 0 && !isDeleted ? (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
              <span>Section</span>
              <select
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--color-ink)]"
                value={item.section_id ?? ""}
                onChange={(event) => updateMediaSection(item.id, event.target.value)}
                disabled={busyId === item.id}
              >
                <option value="">Unsectioned</option>
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
              Select
            </label>

            <Button variant="secondary" onClick={() => handleDownload([item.id])}>
              Download
            </Button>

            {ownerMode ? (
              <>
                {!isVideo && !isDeleted ? (
                  <Button
                    variant={isCover ? "ghost" : "secondary"}
                    onClick={() => updateCoverImage(isCover ? null : item.id)}
                    disabled={busyId === item.id || busyId === "cover"}
                  >
                    {isCover ? "Clear cover" : "Set as cover"}
                  </Button>
                ) : null}

                {!isDeleted ? (
                  <>
                    <Button
                      variant={item.hidden_at ? "secondary" : "ghost"}
                      onClick={() => toggleHidden(item.id, !item.hidden_at)}
                      disabled={busyId === item.id}
                    >
                      {item.hidden_at ? "Unhide" : "Hide"}
                    </Button>

                    <Button variant="danger" onClick={() => deleteMedia(item.id)} disabled={busyId === item.id}>
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => restoreMedia(item.id)} disabled={busyId === item.id}>
                      Restore
                    </Button>
                    <Button variant="danger" onClick={() => permanentlyDeleteMedia(item.id)} disabled={busyId === item.id}>
                      Delete permanently
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
        <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => renderCard(item))}</div>
    </div>
  );
}
