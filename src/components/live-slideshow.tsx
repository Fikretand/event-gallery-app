"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { Dict } from "@/lib/i18n/index";
import type { LiveSlide } from "@/lib/live-slides";

type Props = {
  slug: string;
  title: string;
  initialSlides: LiveSlide[];
  initialIncludePending: boolean;
  isOwner: boolean;
  /** Server-generated QR code (SVG markup) for the guest upload page. */
  qrSvg: string;
  strings: Dict["liveSlideshow"];
};

const IMAGE_MS = 7_000;
const VIDEO_MAX_MS = 20_000;
const POLL_MS = 12_000;
const CONTROLS_MS = 3_500;

type State = {
  slides: Record<string, LiveSlide>;
  /** Play order of slide ids. */
  playlist: string[];
  pos: number;
  /** Ids that arrived while the screen was open and have not been shown yet. */
  fresh: string[];
  /** Bumped on every advance, so a one-slide playlist still restarts its timer. */
  tick: number;
};

type Action = { type: "sync"; slides: LiveSlide[] } | { type: "next" };

function init(slides: LiveSlide[]): State {
  return {
    slides: Object.fromEntries(slides.map((slide) => [slide.id, slide])),
    playlist: slides.map((slide) => slide.id),
    pos: 0,
    fresh: [],
    tick: 0,
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === "next") {
    if (state.playlist.length === 0) return state;
    const shown = state.playlist[state.pos];
    return {
      ...state,
      pos: (state.pos + 1) % state.playlist.length,
      fresh: state.fresh.filter((id) => id !== shown),
      tick: state.tick + 1,
    };
  }

  // sync: fresh signed URLs for everything, new arrivals play next, removed
  // (hidden or deleted) files leave the screen.
  const incomingIds = action.slides.map((slide) => slide.id);
  const incoming = new Set(incomingIds);
  const slides = Object.fromEntries(action.slides.map((slide) => [slide.id, slide]));

  if (state.playlist.length === 0) {
    return { ...state, slides, playlist: incomingIds, pos: 0, fresh: [...state.fresh, ...incomingIds], tick: state.tick + 1 };
  }

  const known = new Set(state.playlist);
  const added = incomingIds.filter((id) => !known.has(id));
  const currentId = state.playlist[state.pos];
  const kept = state.playlist.filter((id) => incoming.has(id));

  let pos = kept.indexOf(currentId);
  const currentRemoved = pos === -1;
  if (currentRemoved) pos = Math.min(state.pos, Math.max(kept.length - 1, 0));

  const playlist = [...kept];
  playlist.splice(currentRemoved ? pos : pos + 1, 0, ...added);
  if (playlist.length === 0) return { ...state, slides, playlist, pos: 0, fresh: [] };

  return {
    slides,
    playlist,
    pos: Math.min(pos, playlist.length - 1),
    fresh: [...state.fresh.filter((id) => incoming.has(id)), ...added],
    tick: currentRemoved ? state.tick + 1 : state.tick,
  };
}

export function LiveSlideshow({ slug, title, initialSlides, initialIncludePending, isOwner, qrSvg, strings: s }: Props) {
  const [state, dispatch] = useReducer(reducer, initialSlides, init);
  const [includePending, setIncludePending] = useState(initialIncludePending);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  const currentId = state.playlist[state.pos];
  const current = currentId ? state.slides[currentId] : undefined;
  const count = state.playlist.length;
  const advance = useCallback(() => dispatch({ type: "next" }), []);

  // ── Poll for new files (and fresh signed URLs) ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}/live${includePending ? "?pending=1" : ""}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { slides?: LiveSlide[] };
        if (!cancelled && Array.isArray(payload.slides)) dispatch({ type: "sync", slides: payload.slides });
      } catch {
        // Venue Wi-Fi blinked; the next poll catches up.
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slug, includePending]);

  // ── Advance photos on a timer; videos advance when they end (or at a cap) ──
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(advance, current.kind === "video" ? VIDEO_MAX_MS : IMAGE_MS);
    return () => window.clearTimeout(timer);
  }, [current, state.tick, advance]);

  // ── Preload the next photo so the change is instant ────────────────────────
  useEffect(() => {
    if (count < 2) return;
    const next = state.slides[state.playlist[(state.pos + 1) % count]];
    if (next?.kind === "image") {
      const img = new Image();
      img.src = next.src;
    }
  }, [state.pos, state.playlist, state.slides, count]);

  // ── Keep the screen awake while the view is open ───────────────────────────
  useEffect(() => {
    type WakeLock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLock> } };
    let lock: WakeLock | null = null;
    const request = () => {
      if (document.visibilityState !== "visible" || !nav.wakeLock) return;
      nav.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, []);

  // ── Controls fade out; any movement brings them back ───────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_MS);
  }, []);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_MS);
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.clearTimeout(hideTimer.current);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function togglePending(next: boolean) {
    setIncludePending(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("pending", "1");
    else url.searchParams.delete("pending");
    window.history.replaceState(null, "", url);
  }

  const isNew = currentId ? state.fresh.includes(currentId) : false;

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-night text-night-ink ${controlsVisible ? "" : "cursor-none"}`}
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      <style>{`
        @keyframes live-in { from { opacity: 0 } to { opacity: 1 } }
        .live-in { animation: live-in 900ms var(--ease-out) both }
        @media (prefers-reduced-motion: reduce) { .live-in { animation: none } }
      `}</style>
      <h1 className="sr-only">{title}</h1>

      {/* ── Current photo or video ── */}
      {current ? (
        <div key={`${current.id}-${state.tick}`} className="live-in absolute inset-0">
          {current.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.src} alt="" className="h-full w-full object-contain" />
          ) : (
            <video
              src={current.src}
              poster={current.poster ?? undefined}
              autoPlay
              muted
              playsInline
              onEnded={advance}
              onError={advance}
              className="h-full w-full object-contain"
            />
          )}
          {isNew ? (
            <span className="absolute left-[3vw] top-[3vh] rounded-full bg-accent px-[1.4vw] py-[0.6vh] text-[clamp(14px,1.4vw,28px)] font-semibold text-accent-ink">
              {s.newBadge}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="font-display text-[clamp(28px,4vw,72px)] font-semibold">{s.emptyTitle}</p>
          <p className="mt-3 max-w-[40ch] text-[clamp(16px,1.6vw,30px)] text-night-ink/80">{s.emptyBody}</p>
        </div>
      )}

      {/* ── Bottom: title and count left, the QR card right ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 bg-gradient-to-t from-night/85 via-night/35 to-transparent px-[3vw] pb-[3vh] pt-[12vh]">
        <div className="min-w-0">
          <p className="truncate font-display text-[clamp(22px,2.6vw,52px)] font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-[clamp(14px,1.3vw,26px)] text-night-ink/80">{s.inGallery.replace("{{count}}", String(count))}</p>
        </div>
        <div className="flex shrink-0 items-center gap-[1.2vw] rounded-[clamp(14px,1.4vw,28px)] bg-card p-[clamp(10px,1vw,20px)] text-ink">
          <div
            className="aspect-square w-[clamp(96px,9vw,200px)] [&>svg]:h-full [&>svg]:w-full"
            // Server-generated QR markup for our own upload URL.
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="max-w-[22ch]">
            <p className="font-display text-[clamp(15px,1.5vw,30px)] font-semibold leading-tight">{s.scanTitle}</p>
            <p className="mt-1 text-[clamp(12px,1vw,20px)] leading-snug text-ink-2">{s.scanBody}</p>
          </div>
        </div>
      </div>

      {/* ── Controls: appear on movement ── */}
      <div
        className={`absolute right-[2vw] top-[2vh] flex items-center gap-2 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          className="btn btn-sm bg-night-2 text-night-ink ring-1 ring-night-ink/25 hover:bg-night"
        >
          {isFullscreen ? s.exitFullscreen : s.fullscreen}
        </button>
      </div>

      {isOwner ? (
        <div
          className={`absolute left-[2vw] top-[2vh] max-w-[min(440px,80vw)] rounded-[var(--radius-card)] bg-night-2 p-4 text-sm ring-1 ring-night-ink/20 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(event) => togglePending(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="font-semibold leading-snug">{s.includePending}</span>
          </label>
          <p className="mt-2 pl-8 text-sm leading-5 text-night-ink/80">{s.includePendingWarning}</p>
        </div>
      ) : null}
    </div>
  );
}
