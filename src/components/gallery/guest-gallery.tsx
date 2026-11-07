"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ConfettiWordmark, PrintFrame, PrintMark } from "@/components/gallery/confetti-mark";
import { GalleryViewer, type ViewerItem } from "@/components/gallery/gallery-viewer";
import { AlertIcon, CheckIcon, DownloadIcon, LockIcon, PlayIcon } from "@/components/ui/icons";
import {
  formatDuration,
  formatSize,
  justifiedRows,
  markHeroes,
  pluralForm,
  ratioOf,
  splitIntoZipParts,
  ZIP_PART_MAX_BYTES,
  type LayoutRow,
} from "@/lib/gallery-layout";
import { t, type Dict } from "@/lib/i18n/index";
import { cn } from "@/lib/utils";

export type GuestMedia = {
  id: string;
  video: boolean;
  message: boolean;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumb: string | null;
  preview: string | null;
  source: "guest" | "photographer";
  sectionId: string | null;
  size: number;
  /** Only on a guest's video message. */
  from: string | null;
};

type Filter = "all" | "photos" | "videos" | "photographer" | "guest";
const FILTERS: Filter[] = ["all", "photos", "videos", "photographer", "guest"];

type Strings = { gallery: Dict["gallery"]; viewer: Dict["galleryViewer"]; g: Dict["guestGallery"] };
type Rect = { x: number; y: number; w: number; h: number };

type PartState = { ids: string[]; bytes: number; status: "waiting" | "preparing" | "downloading" | "done" | "failed"; p: number };
type ZipState =
  | null
  | { mode: "single"; count: number; status: "preparing" | "downloading" | "done" | "failed"; p: number }
  | { mode: "batch"; parts: PartState[] };

type LayoutCell = { id: string; width: number; height: number; hero?: boolean; media: GuestMedia };

function pass(item: GuestMedia, filter: Filter) {
  if (filter === "photos") return !item.video;
  if (filter === "videos") return item.video;
  if (filter === "photographer") return item.source === "photographer";
  if (filter === "guest") return item.source === "guest";
  return true;
}

function plural(g: Dict["guestGallery"], key: "preparingZip" | "batchTitle" | "partFiles", count: number) {
  return g[`${key}_${pluralForm(count)}` as const];
}

/** Triggers a browser download of a URL or blob without leaving the page. */
function saveLink(href: string, filename?: string) {
  const link = document.createElement("a");
  link.href = href;
  if (filename) link.download = filename;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadOne(id: string) {
  const response = await fetch(`/api/media/${id}/download`, { method: "POST", credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) throw new Error(payload.error ?? "download");
  saveLink(payload.url);
}

/**
 * One ZIP from the batch route, with progress while its bytes arrive (the
 * route sends Content-Length once the archive is built).
 */
async function downloadZip(ids: string[], onProgress: (status: "preparing" | "downloading", p: number) => void, signal: AbortSignal) {
  if (ids.length === 1) {
    onProgress("preparing", 0);
    await downloadOne(ids[0]);
    return;
  }
  onProgress("preparing", 0);
  const response = await fetch("/api/media/download-batch", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "zip");
  }
  const total = Number(response.headers.get("Content-Length")) || 0;
  const filename = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "confetti-galerija.zip";
  let blob: Blob;
  if (response.body && total > 0) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    onProgress("downloading", 0);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress("downloading", Math.min(0.99, received / total));
    }
    blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
  } else {
    blob = await response.blob();
  }
  const url = URL.createObjectURL(blob);
  saveLink(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function useMediaQuery(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

function useOnline() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("online", notify);
      window.addEventListener("offline", notify);
      return () => {
        window.removeEventListener("online", notify);
        window.removeEventListener("offline", notify);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

function VideoBadge({ duration, large = false }: { duration: number | null; large?: boolean }) {
  const label = formatDuration(duration);
  return (
    <span
      className={cn(
        "pointer-events-none absolute inline-flex items-center rounded-full bg-night/70 font-semibold leading-tight text-night-ink",
        large ? "bottom-2 left-2 gap-[5px] py-1 pl-2 pr-2.5 text-[13px]" : "bottom-1.5 left-1.5 gap-1 py-[3px] pl-1.5 pr-2 text-xs",
        !label && (large ? "pr-2" : "pr-1.5"),
      )}
    >
      <PlayIcon className={large ? "h-[13px] w-[13px]" : "h-3 w-3"} />
      {label}
    </span>
  );
}

function Tile({
  media,
  width,
  radius,
  label,
  hidden,
  selectMode,
  selected,
  strings,
  onOpen,
}: {
  media: GuestMedia;
  width: number;
  radius: number;
  label: string;
  hidden: boolean;
  selectMode: boolean;
  selected: boolean;
  strings: Dict["guestGallery"];
  onOpen: (el: HTMLButtonElement) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const src = media.thumb ?? (media.video ? null : media.preview);
  // A cached image can finish before hydration attaches onLoad.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <button
      type="button"
      data-tile={media.id}
      aria-label={label}
      aria-pressed={selectMode ? selected : undefined}
      onClick={(event) => {
        if (failed && !selectMode) {
          setFailed(false);
          setLoaded(false);
          setAttempt((n) => n + 1);
          return;
        }
        onOpen(event.currentTarget);
      }}
      className="relative h-full flex-none cursor-pointer overflow-hidden border-0 bg-paper-3 p-0"
      style={{ width, borderRadius: radius, visibility: hidden ? "hidden" : "visible" }}
    >
      {!failed && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attempt}
          ref={imgRef}
          src={attempt ? `${src}${src.includes("?") ? "&" : "?"}r=${attempt}` : src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover transition-[opacity,transform,border-radius] duration-[240ms] ease-out"
          style={{
            opacity: loaded ? 1 : 0,
            transform: selected ? "scale(0.9)" : undefined,
            borderRadius: selected ? 6 : 0,
          }}
        />
      ) : null}
      {!failed && !src && media.video && media.preview ? (
        <video
          key={attempt}
          src={media.preview}
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover transition-opacity duration-[240ms] ease-out"
          style={{ opacity: loaded ? 1 : 0, transform: selected ? "scale(0.9)" : undefined, borderRadius: selected ? 6 : 0 }}
        />
      ) : null}
      {media.video && !failed ? <VideoBadge duration={media.duration} /> : null}
      {failed ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-paper-3 p-2 text-center text-[13px] font-medium leading-tight text-ink-2">
          <AlertIcon className="h-5 w-5" />
          <span>{strings.notLoaded}</span>
          <span className="font-semibold text-accent-deep underline underline-offset-[0.16em]">{strings.retry}</span>
        </span>
      ) : null}
      {selectMode ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute bottom-1.5 right-1.5 box-border flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-solid border-paper text-accent-ink shadow-check",
            selected ? "bg-accent" : "bg-ink/30",
          )}
        >
          {selected ? <CheckIcon className="h-[15px] w-[15px] [stroke-width:2.4]" /> : null}
        </span>
      ) : null}
    </button>
  );
}

export function GuestGallery({
  locale,
  title,
  dateLabel,
  cover,
  media,
  sections,
  fontClassName,
  strings,
}: {
  locale: "en" | "bs";
  title: string;
  dateLabel: string | null;
  cover: { src: string; ratio: number } | null;
  media: GuestMedia[];
  sections: { id: string; name: string }[];
  fontClassName: string;
  strings: Strings;
}) {
  const { viewer: vs, g, gallery: d } = strings;
  const mobile = useMediaQuery("(max-width: 767px)", false);
  const online = useOnline();

  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const zipAbort = useRef<AbortController | null>(null);
  const reopenFocus = useRef<HTMLElement | null>(null);

  const [gridWidth, setGridWidth] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [condensed, setCondensed] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [zip, setZip] = useState<ZipState>(null);
  const [viewer, setViewer] = useState<null | { list: "grid" | "messages"; index: number; origin: Rect | null }>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  const stickyTop = mobile ? 44 : 64;
  const gap = mobile ? 2 : 4;
  const target = mobile ? 150 : 260;
  const maxPerRow = mobile ? 4 : 6;
  const radius = mobile ? 0 : 2;

  const messages = useMemo(() => media.filter((item) => item.message && item.video), [media]);
  const grid = useMemo(() => media.filter((item) => !item.message), [media]);
  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>;
    for (const f of FILTERS) result[f] = grid.filter((item) => pass(item, f)).length;
    return result;
  }, [grid]);
  // Guests see only the filters that would show something.
  const filters = FILTERS.filter((f) => f === "all" || counts[f] > 0);
  const visible = useMemo(() => grid.filter((item) => pass(item, filter)), [grid, filter]);

  // Chapters: the owner's sections in their order, then everything without
  // one. A gallery with no sections is a single untitled chapter.
  const chapters = useMemo(() => {
    const known = new Set(sections.map((section) => section.id));
    const list: { key: string; title: string | null; items: GuestMedia[] }[] = [];
    if (sections.length === 0) {
      list.push({ key: "all", title: null, items: visible });
    } else {
      for (const section of sections) {
        list.push({ key: section.id, title: section.name, items: visible.filter((item) => item.sectionId === section.id) });
      }
      list.push({
        key: "rest",
        title: vs.everythingElse,
        items: visible.filter((item) => !item.sectionId || !known.has(item.sectionId)),
      });
    }
    return list.filter((chapter) => chapter.items.length > 0);
  }, [sections, visible, vs.everythingElse]);

  // The order the viewer walks: the order on screen.
  const ordered = useMemo(() => chapters.flatMap((chapter) => chapter.items), [chapters]);
  const total = ordered.length;

  const layouts = useMemo(() => {
    return chapters.map((chapter) => {
      const cells: LayoutCell[] = markHeroes(
        chapter.items.map((item) => {
          const ratio = ratioOf(item);
          return { id: item.id, width: ratio * 1000, height: 1000, media: item };
        }),
      );
      return justifiedRows(cells, gridWidth, target, gap, maxPerRow) as LayoutRow<LayoutCell>[];
    });
  }, [chapters, gridWidth, target, gap, maxPerRow]);

  // The grid is laid out to its real width.
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setGridWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The condensed bar appears once the filters reach the top.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const sentinel = sentinelRef.current;
      setCondensed(Boolean(sentinel && sentinel.getBoundingClientRect().top <= stickyTop + 4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stickyTop]);

  useEffect(() => () => zipAbort.current?.abort(), []);

  const pickFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    setSelected([]);
    const sentinel = sentinelRef.current;
    if (sentinel) {
      const top = sentinel.getBoundingClientRect().top + window.scrollY - stickyTop;
      if (window.scrollY > top) window.scrollTo({ top });
    }
  };

  // ── selection & ZIP ──
  const startSelect = () => {
    setSelectMode(true);
    setSelected([]);
  };
  const cancelSelect = () => {
    if (zip?.mode === "single") {
      zipAbort.current?.abort();
      setZip(null);
    }
    setSelectMode(false);
    setSelected([]);
  };
  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const runBatch = useCallback(async (parts: PartState[], from: number) => {
    zipAbort.current?.abort();
    const controller = new AbortController();
    zipAbort.current = controller;
    const state = parts.map((part) => ({ ...part }));
    const publish = () => setZip({ mode: "batch", parts: state.map((part) => ({ ...part })) });
    for (let i = from; i < state.length; i += 1) {
      if (controller.signal.aborted) return;
      state[i].status = "preparing";
      state[i].p = 0;
      publish();
      try {
        await downloadZip(
          state[i].ids,
          (status, p) => {
            state[i].status = status;
            state[i].p = p;
            publish();
          },
          controller.signal,
        );
        state[i].status = "done";
        state[i].p = 1;
        publish();
      } catch {
        if (controller.signal.aborted) return;
        state[i].status = "failed";
        publish();
        return;
      }
    }
  }, []);

  const startBatch = (items: GuestMedia[]) => {
    const parts: PartState[] = splitIntoZipParts(items.map((item) => ({ id: item.id, size_bytes: item.size }))).map(
      (part) => ({ ...part, status: "waiting", p: 0 }),
    );
    if (parts.length === 0) return;
    setSelectMode(false);
    setSelected([]);
    void runBatch(parts, 0);
  };

  const downloadAll = () => startBatch(ordered);

  const downloadSelected = async () => {
    const items = ordered.filter((item) => selected.includes(item.id));
    if (items.length === 0) return;
    if (splitIntoZipParts(items.map((item) => ({ id: item.id, size_bytes: item.size }))).length > 1) {
      startBatch(items);
      return;
    }
    zipAbort.current?.abort();
    const controller = new AbortController();
    zipAbort.current = controller;
    const count = items.length;
    setZip({ mode: "single", count, status: "preparing", p: 0 });
    try {
      await downloadZip(items.map((item) => item.id), (status, p) => setZip({ mode: "single", count, status, p }), controller.signal);
      setZip({ mode: "single", count, status: "done", p: 1 });
      window.setTimeout(() => {
        setZip((current) => (current?.mode === "single" ? null : current));
        setSelectMode(false);
        setSelected([]);
      }, 1800);
    } catch {
      if (!controller.signal.aborted) setZip({ mode: "single", count, status: "failed", p: 0 });
    }
  };

  const closeZip = () => {
    zipAbort.current?.abort();
    setZip(null);
  };

  // ── viewer ──
  const rectOf = (el: Element | null): Rect | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  const openViewer = (list: "grid" | "messages", index: number, el: HTMLElement) => {
    reopenFocus.current = el;
    const img = list === "messages" ? el.querySelector("img") : null;
    setViewer({ list, index, origin: rectOf(img ?? el) });
  };

  const viewerItems: ViewerItem[] = useMemo(
    () =>
      (viewer?.list === "messages" ? messages : ordered).map((item) => ({
        id: item.id,
        video: item.video,
        width: item.width,
        height: item.height,
        duration: item.duration,
        thumb: item.thumb,
        preview: item.preview,
        from: item.from,
        message: item.message,
      })),
    [viewer?.list, messages, ordered],
  );

  const originFor = useCallback(
    (index: number): Rect | null => {
      if (!viewer) return null;
      const item = viewerItems[index];
      if (!item) return null;
      const el =
        viewer.list === "grid"
          ? document.querySelector(`[data-tile="${item.id}"]`)
          : document.querySelector(`[data-msg="${item.id}"] img`);
      let rect = rectOf(el);
      if (!rect || !el) return null;
      // Scroll the tile into view first, so the photo lands where it lives.
      if (viewer.list === "grid" && (rect.y < stickyTop + 52 || rect.y + rect.h > window.innerHeight)) {
        window.scrollBy({ top: rect.y - (window.innerHeight / 2 - rect.h / 2), behavior: "instant" as ScrollBehavior });
        rect = rectOf(el);
      }
      return rect;
    },
    [viewer, viewerItems, stickyTop],
  );

  const closeViewer = useCallback(() => {
    setViewer(null);
    // After the re-render: the tile is invisible while the viewer owns it.
    requestAnimationFrame(() => reopenFocus.current?.focus({ preventScroll: true }));
  }, []);

  const report = useCallback(async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/media/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) return false;
      setReportedIds((current) => [...current, id]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const downloadFromViewer = useCallback(async (id: string) => {
    try {
      await downloadOne(id);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── derived labels ──
  const nSel = selected.length;
  const canSelect = total > 1;
  const zipAllLabel = t(vs.downloadAllZip, { count: counts.all });
  const meta = dateLabel ? t(g.metaLine, { date: dateLabel, count: counts.all }) : t(d.visibleFiles, { count: counts.all });
  const selTitle = nSel ? t(g.selectedCount, { count: nSel }) : g.selectPhotos;
  const barOn = condensed || selectMode;
  const viewerOpenId = viewer ? viewerItems[viewer.index]?.id : null;
  const single = zip?.mode === "single" ? zip : null;
  const batch = zip?.mode === "batch" ? zip : null;
  const batchDone = Boolean(batch && batch.parts.every((part) => part.status === "done"));
  const batchFailedAt = batch ? batch.parts.findIndex((part) => part.status === "failed") : -1;
  const batchBytes = batch ? batch.parts.reduce((sum, part) => sum + part.bytes, 0) : 0;
  const singleText = single
    ? single.status === "done"
      ? g.downloaded
      : single.status === "failed"
        ? vs.zipFailed
        : t(plural(g, "preparingZip", single.count), { count: single.count })
    : "";
  const singlePct = single && single.status === "downloading" ? `${Math.round(single.p * 100)} %` : "";
  // Bars grow by transform (no layout per frame); "preparing" shows a quarter, pulsing.
  const singleScale = !single ? 0 : single.status === "done" ? 1 : single.status === "preparing" ? 0.25 : single.p;

  const zipButton = (compact = false) => (
    <button
      type="button"
      onClick={downloadAll}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-full border border-solid border-field-edge bg-card font-semibold text-ink transition-colors duration-[var(--dur-micro)] hover:border-ink-2 hover:bg-paper-2",
        compact ? "min-h-10 px-4 text-sm" : "min-h-11 px-5 text-[15px]",
      )}
    >
      <DownloadIcon className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
      {zipAllLabel}
    </button>
  );

  const selectButton = (className?: string) => (
    <button
      type="button"
      onClick={startSelect}
      className={cn(
        "min-h-11 cursor-pointer rounded-full border-0 bg-transparent font-semibold text-ink transition-colors duration-[var(--dur-micro)] md:hover:bg-paper-3",
        className,
      )}
    >
      {vs.select}
    </button>
  );

  const messageCard = (item: GuestMedia, index: number, large: boolean) => (
    <button
      key={item.id}
      type="button"
      data-msg={item.id}
      onClick={(event) => openViewer("messages", index, event.currentTarget)}
      aria-label={item.from ? t(g.messageLabel, { name: item.from }) : vs.messagesTitle}
      className={cn(
        "box-border cursor-pointer rounded-[10px] border border-solid border-rule bg-card text-left transition-colors hover:border-rule-2",
        large ? "px-2.5 pb-4 pt-2.5" : "w-[148px] flex-none snap-start px-2 pb-3 pt-2",
      )}
      style={{ visibility: viewer?.list === "messages" && viewerOpenId === item.id ? "hidden" : "visible" }}
    >
      <span className="relative block aspect-[4/5] overflow-hidden rounded bg-paper-3">
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb} alt="" loading="lazy" className="block h-full w-full object-cover" />
        ) : item.preview ? (
          <video src={item.preview} muted playsInline preload="metadata" className="block h-full w-full object-cover" />
        ) : null}
        <VideoBadge duration={item.duration} large={large} />
      </span>
      {item.from ? (
        <span className={cn("block font-display italic leading-tight text-ink", large ? "mt-3 text-xl" : "mt-2.5 text-lg")}>
          {t(vs.messageFrom, { name: item.from })}
        </span>
      ) : null}
    </button>
  );

  let tileIndex = 0;

  return (
    <div className="relative">
      {/* ── top: phone ── */}
      <div className="bg-paper-2 md:hidden">
        <div className="flex h-[52px] items-center justify-between pl-5 pr-2">
          <ConfettiWordmark />
          {canSelect ? selectButton("px-3 text-base") : null}
        </div>
        {cover ? (
          <div className="flex justify-center pt-4">
            <PrintFrame src={cover.src} alt={g.coverAlt} width={250} ratio={cover.ratio} />
          </div>
        ) : null}
        <div className="flex flex-col items-center px-6 pb-8 pt-7 text-center">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss">
            <LockIcon className="h-4 w-4" />
            {d.privateGallery}
          </p>
          <h1 className="mt-2.5 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">{title}</h1>
          <p className="mt-1.5 font-display text-[22px] italic leading-tight text-accent-deep">{d.clientGallery}</p>
          <p className="mt-3 text-sm font-medium text-ink-2">{meta}</p>
          {canSelect ? <div className="mt-5">{zipButton()}</div> : null}
        </div>
        {messages.length > 0 ? (
          <section aria-labelledby="vp-m" className="pb-8 pt-1">
            <div className="flex items-baseline justify-between px-5 pb-3">
              <h2 id="vp-m" className="m-0 font-display text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                {vs.messagesTitle}
              </h2>
              <span className="text-sm font-medium text-muted">{messages.length}</span>
            </div>
            <div className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
              {messages.map((item, index) => messageCard(item, index, false))}
            </div>
          </section>
        ) : null}
      </div>

      {/* ── top: desktop ── */}
      <div className="hidden bg-paper-2 md:block">
        <div className="mx-auto box-border max-w-[1440px] px-16">
          <div className="flex h-[72px] items-center justify-between">
            <ConfettiWordmark size="lg" />
            <div className="flex items-center gap-2">
              {canSelect ? zipButton() : null}
              {canSelect ? selectButton("px-4 text-[15px]") : null}
            </div>
          </div>
          <div className={cn("grid items-end gap-8 pb-16 pt-8", cover && "grid-cols-[minmax(0,7fr)_minmax(0,5fr)]")}>
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss">
                <LockIcon className="h-4 w-4" />
                {d.privateGallery}
              </p>
              <h1 className="mt-4 font-display text-[clamp(56px,5.8vw,84px)] font-semibold leading-[1.03] tracking-[-0.025em]">{title}</h1>
              <p className="mt-2.5 font-display text-[30px] italic leading-tight text-accent">{d.clientGallery}</p>
              <p className="mt-6 text-[17px] font-medium text-ink-2">{meta}</p>
            </div>
            {cover ? (
              <div className="flex justify-end">
                <PrintFrame src={cover.src} alt={g.coverAlt} width={380} ratio={cover.ratio} />
              </div>
            ) : null}
          </div>
          {messages.length > 0 ? (
            <section aria-labelledby="vp-d" className="pb-16">
              <div className="flex items-baseline gap-3 border-0 border-t border-solid border-rule pb-4 pt-6">
                <h2 id="vp-d" className="m-0 font-display text-[26px] font-semibold leading-tight tracking-[-0.01em]">
                  {vs.messagesTitle}
                </h2>
                <span className="text-sm font-medium text-muted">{messages.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-6">{messages.map((item, index) => messageCard(item, index, true))}</div>
            </section>
          ) : null}
        </div>
      </div>

      {/* ── filters (sticky) ── */}
      <div ref={sentinelRef} aria-hidden="true" />
      {total > 0 || filter !== "all" ? (
        <div className="sticky z-20 bg-paper" style={{ top: stickyTop }}>
          <div
            role="tablist"
            aria-label={g.filterLabel}
            className="mx-auto box-border flex max-w-[1440px] gap-1 overflow-x-auto px-3 py-1 [scrollbar-width:none] md:px-[60px]"
          >
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => pickFilter(f)}
                className="flex min-h-11 flex-none cursor-pointer items-center border-0 bg-transparent p-0"
              >
                <span
                  className={cn(
                    "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors duration-[var(--dur-micro)]",
                    filter === f ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2",
                  )}
                >
                  {f === "all"
                    ? vs.filterAll
                    : f === "photos"
                      ? vs.filterPhotos
                      : f === "videos"
                        ? vs.filterVideos
                        : f === "photographer"
                          ? vs.filterPhotographer
                          : vs.filterGuest}
                </span>
              </button>
            ))}
          </div>
          {!online ? (
            <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2.5 text-sm font-medium leading-snug text-warning">
              <AlertIcon className="h-[18px] w-[18px]" />
              <span>{g.offline}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── chapters + grid ── */}
      <div ref={gridRef} className="mx-auto w-full md:w-[min(100%-128px,1312px)]">
        {gridWidth > 0
          ? chapters.map((chapter, ci) => (
              <section key={chapter.key} aria-label={chapter.title ?? undefined}>
                {chapter.title ? (
                  <div className="flex items-baseline justify-between gap-3 px-4 pb-2.5 pt-7 md:px-0 md:pb-4 md:pt-12">
                    <h2 className="m-0 font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] md:text-[26px]">
                      {chapter.title}
                    </h2>
                    <span className="text-sm font-medium text-muted">{chapter.items.length}</span>
                  </div>
                ) : (
                  <div className="h-2 md:h-6" />
                )}
                <div className="flex flex-col" style={{ gap }}>
                  {layouts[ci].map((row, ri) => (
                    <div key={ri} className="flex" style={{ gap, height: row.height }}>
                      {row.items.map(({ item: cell, width }) => {
                        const position = tileIndex++;
                        const isSelected = selected.includes(cell.id);
                        const label =
                          t(cell.media.video ? g.videoTile : g.photoTile, { n: position + 1, total }) +
                          (isSelected ? g.selectedSuffix : "");
                        return (
                          <Tile
                            key={cell.id}
                            media={cell.media}
                            width={width}
                            radius={radius}
                            label={label}
                            hidden={viewer?.list === "grid" && viewerOpenId === cell.id}
                            selectMode={selectMode}
                            selected={isSelected}
                            strings={g}
                            onOpen={(el) => (selectMode ? toggle(cell.id) : openViewer("grid", position, el))}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))
          : null}

        {total === 0 ? (
          <div className="flex flex-col items-center px-6 pb-16 pt-12 text-center">
            <p className="m-0 font-display text-[22px] font-semibold leading-tight">{vs.emptyTitle}</p>
            <p className="mt-2.5 max-w-[32ch] text-ink-2 [text-wrap:pretty]">{vs.emptyBody}</p>
          </div>
        ) : (
          <div
            className="flex items-center justify-center gap-1.5 px-4 pt-10 text-[13px] font-medium text-muted"
            style={{ paddingBottom: (mobile ? 40 : 56) + (selectMode ? 80 : 0) }}
          >
            <LockIcon className="h-3.5 w-3.5" />
            {g.footer}
          </div>
        )}
      </div>

      {/* ── condensed header ── */}
      <div
        aria-hidden={!barOn}
        className="fixed inset-x-0 top-0 z-40 box-border border-0 border-b border-solid border-rule bg-paper/90 backdrop-blur-[14px] backdrop-saturate-[1.2] transition-[opacity,transform] duration-[200ms,260ms] [transition-timing-function:ease-out,var(--ease-out)]"
        style={{
          height: stickyTop,
          opacity: barOn ? 1 : 0,
          transform: barOn ? "none" : "translateY(-6px)",
          pointerEvents: barOn ? "auto" : "none",
        }}
      >
        <div className="mx-auto box-border flex h-full max-w-[1440px] items-center justify-between gap-3 px-2 md:px-16">
          {selectMode ? (
            <>
              <span aria-live="polite" className="pl-2 font-display text-[17px] font-semibold tracking-[-0.01em] md:pl-0 md:text-xl">
                {selTitle}
              </span>
              <button type="button" tabIndex={barOn ? 0 : -1} onClick={cancelSelect} className="min-h-11 cursor-pointer border-0 bg-transparent px-3 text-base font-semibold text-ink">
                {g.cancel}
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex min-w-0 items-center gap-2 pl-2 md:pl-0">
                <PrintMark size="sm" />
                <span className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] md:text-xl">{title}</span>
              </span>
              <div className="flex items-center gap-2">
                {!mobile && canSelect ? zipButton(true) : null}
                {canSelect ? selectButton("px-3 text-base") : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── select bar: phone ── */}
      {mobile && selectMode ? (
        <div className="fixed inset-x-0 bottom-0 z-[45] box-border border-0 border-t border-solid border-rule bg-paper/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-[14px]">
          {!single ? (
            <button
              type="button"
              onClick={downloadSelected}
              disabled={nSel === 0}
              className={cn(
                "flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-accent text-base font-semibold text-accent-ink",
                nSel === 0 && "cursor-default opacity-55",
              )}
            >
              <DownloadIcon className="h-[18px] w-[18px]" />
              {vs.downloadSelected}
            </button>
          ) : (
            <div role="status" aria-live="polite" className="flex min-h-[52px] flex-col justify-center gap-2">
              <div className="flex items-center justify-between text-[15px] font-semibold">
                <span className={cn("inline-flex items-center gap-1.5", single.status === "done" ? "text-moss" : single.status === "failed" ? "text-error" : "text-ink")}>
                  {single.status === "done" ? <CheckIcon className="h-[18px] w-[18px]" /> : null}
                  {singleText}
                </span>
                {single.status === "failed" ? (
                  <button type="button" onClick={downloadSelected} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent-deep underline underline-offset-[0.16em]">
                    {g.retry}
                  </button>
                ) : (
                  <span>{singlePct}</span>
                )}
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-paper-3">
                <div
                  className={cn("h-full w-full origin-left transition-transform duration-[160ms] ease-linear", single.status === "done" ? "bg-moss" : "bg-ink", single.status === "preparing" && "motion-safe:animate-pulse")}
                  style={{ transform: `scaleX(${singleScale})` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── select bar: desktop ── */}
      {!mobile && selectMode ? (
        <div className="fixed bottom-7 left-1/2 z-[45] flex -translate-x-1/2 items-center gap-3 rounded-full border border-solid border-rule bg-card py-2 pl-6 pr-2 shadow-sheet">
          <span aria-live="polite" className="min-w-[120px] text-[15px] font-semibold">
            {selTitle}
          </span>
          {single ? (
            <span role="status" className={cn("inline-flex min-w-[260px] items-center gap-2.5 text-sm font-semibold", single.status === "done" ? "text-moss" : single.status === "failed" ? "text-error" : "text-ink")}>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-paper-3">
                <span
                  className={cn("block h-full w-full origin-left transition-transform duration-[160ms] ease-linear", single.status === "done" ? "bg-moss" : "bg-ink", single.status === "preparing" && "motion-safe:animate-pulse")}
                  style={{ transform: `scaleX(${singleScale})` }}
                />
              </span>
              {singleText} {singlePct}
            </span>
          ) : null}
          <button type="button" onClick={cancelSelect} className="min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-4 text-[15px] font-semibold text-ink hover:bg-paper-2">
            {g.cancel}
          </button>
          <button
            type="button"
            onClick={downloadSelected}
            disabled={nSel === 0 || (single !== null && single.status !== "failed")}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-accent px-[22px] text-[15px] font-semibold text-accent-ink",
              (nSel === 0 || (single !== null && single.status !== "failed")) && "cursor-default opacity-55",
            )}
          >
            <DownloadIcon className="h-[18px] w-[18px]" />
            {single?.status === "failed" ? g.retry : vs.downloadSelected}
          </button>
        </div>
      ) : null}

      {/* ── ZIP in parts ── */}
      {batch ? (
        <>
          {mobile ? <div className="fixed inset-0 z-[46] bg-ink/30" /> : null}
          <div
            role="dialog"
            aria-label={vs.download}
            className={cn(
              "fixed z-[47] box-border bg-card px-5 pt-2 shadow-sheet",
              mobile
                ? "inset-x-0 bottom-0 rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+20px)]"
                : "bottom-6 right-6 w-[400px] rounded-2xl pb-5",
            )}
          >
            {mobile ? <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-rule" /> : null}
            <div className={mobile ? "" : "pt-3"}>
              <p className="m-0 font-display text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                {batchDone
                  ? g.batchDoneTitle
                  : t(plural(g, "batchTitle", batch.parts.length), { count: batch.parts.length, size: formatSize(batchBytes, locale) })}
              </p>
              <p className="mt-1.5 text-sm leading-[1.45] text-ink-2 [text-wrap:pretty]">
                {t(g.batchBody, { size: formatSize(ZIP_PART_MAX_BYTES, locale) })}
              </p>
            </div>
            <ul role="list" className="m-0 mt-3.5 max-h-[45svh] list-none overflow-y-auto p-0">
              {batch.parts.map((part, i) => {
                const active = part.status === "preparing" || part.status === "downloading";
                const status =
                  part.status === "done"
                    ? g.downloaded
                    : part.status === "failed"
                      ? g.statusFailed
                      : part.status === "downloading"
                        ? `${Math.round(part.p * 100)} %`
                        : part.status === "preparing"
                          ? g.statusPreparing
                          : g.statusWaiting;
                return (
                  <li key={i} className="border-0 border-t border-solid border-rule py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-[15px] font-semibold leading-snug">{t(g.partTitle, { n: i + 1, total: batch.parts.length })}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted">
                          {t(plural(g, "partFiles", part.ids.length), { count: part.ids.length, size: formatSize(part.bytes, locale) })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-semibold",
                          part.status === "done" ? "text-moss" : part.status === "failed" ? "text-error" : active ? "text-ink" : "text-muted",
                        )}
                      >
                        {part.status === "done" ? <CheckIcon className="h-[18px] w-[18px]" /> : null}
                        {status}
                      </span>
                    </div>
                    {active ? (
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(part.p * 100)}
                        className="mt-2.5 h-1 overflow-hidden rounded-full bg-paper-3"
                      >
                        <div
                          className={cn("h-full w-full origin-left bg-ink transition-transform duration-[160ms] ease-linear", part.status === "preparing" && "motion-safe:animate-pulse")}
                          style={{ transform: `scaleX(${part.status === "preparing" ? 0.25 : part.p})` }}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {batchDone ? (
              <div role="status" className="mt-1 flex items-center gap-2 rounded-[10px] bg-moss-soft px-3.5 py-3 text-sm font-semibold text-moss">
                <CheckIcon className="h-[18px] w-[18px]" />
                {g.batchDone}
              </div>
            ) : batchFailedAt >= 0 ? (
              <div role="alert" className="mt-1 flex items-center justify-between gap-3 rounded-[10px] bg-error-soft px-3.5 py-3 text-sm font-semibold text-error">
                <span>{vs.zipFailed}</span>
                <button type="button" onClick={() => void runBatch(batch.parts, batchFailedAt)} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-error underline underline-offset-[0.16em]">
                  {g.retry}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[13px] text-muted">{g.keepOpen}</p>
            )}
            <button
              type="button"
              onClick={closeZip}
              className="mt-3.5 min-h-12 w-full cursor-pointer rounded-full border border-solid border-field-edge bg-card text-[15px] font-semibold text-ink hover:bg-paper-2"
            >
              {batchDone ? vs.close : g.cancelDownload}
            </button>
          </div>
        </>
      ) : null}

      {viewer ? (
        <GalleryViewer
          items={viewerItems}
          index={viewer.index}
          onIndex={(index) => setViewer((current) => (current ? { ...current, index } : current))}
          onClose={closeViewer}
          origin={viewer.origin}
          originFor={originFor}
          mobile={mobile}
          fontClassName={fontClassName}
          strings={{ viewer: vs, g }}
          reportedIds={reportedIds}
          onReport={report}
          onDownload={downloadFromViewer}
        />
      ) : null}
    </div>
  );
}
