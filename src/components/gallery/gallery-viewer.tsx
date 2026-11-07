"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AlertIcon, CheckIcon, CloseIcon, DownloadIcon, PlayIcon } from "@/components/ui/icons";
import { formatDuration, ratioOf } from "@/lib/gallery-layout";
import { t, type Dict } from "@/lib/i18n/index";
import { cn } from "@/lib/utils";

export type ViewerItem = {
  id: string;
  video: boolean;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumb: string | null;
  preview: string | null;
  /** A guest's video message: "From: name" instead of the report button. */
  from: string | null;
  message: boolean;
};

type Rect = { x: number; y: number; w: number; h: number };
type ReportReason = keyof Dict["galleryViewer"]["reportReasons"];
const REASONS: ReportReason[] = ["inappropriate", "private", "other"];

// One curve for every move in the gallery: no bounce, no overshoot.
const EASE = "cubic-bezier(.16,1,.3,1)";
const HIDE_AFTER_MS = 3200;
const SLIDE_GAP = 16;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.25 21V3.75m0 0h11.25l-2.25 4.5 2.25 4.5H5.25" />
    </svg>
  );
}

const pill =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-night-2/80 text-[15px] font-semibold text-night-ink transition-colors duration-[var(--dur-micro)] hover:bg-night-3";

export function GalleryViewer({
  items,
  index,
  onIndex,
  onClose,
  origin,
  originFor,
  mobile,
  fontClassName,
  strings,
  reportedIds,
  onReport,
  onDownload,
}: {
  items: ViewerItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** The thumbnail the viewer grows out of. */
  origin: Rect | null;
  /** Where to shrink back to when closing (scrolls the tile into view). */
  originFor: (index: number) => Rect | null;
  mobile: boolean;
  fontClassName: string;
  strings: { viewer: Dict["galleryViewer"]; g: Dict["guestGallery"] };
  reportedIds: string[];
  onReport: (id: string, reason: ReportReason) => Promise<boolean>;
  onDownload: (id: string) => Promise<boolean>;
}) {
  const vs = strings.viewer;
  const g = strings.g;

  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [size, setSize] = useState(() => ({
    W: typeof window === "undefined" ? 390 : window.innerWidth,
    H: typeof window === "undefined" ? 844 : window.innerHeight,
  }));
  // Natural sizes learned from loaded pixels, for files stored without them.
  const [natural, setNatural] = useState<Record<string, { w: number; h: number }>>({});
  const [controls, setControls] = useState(true);
  const [report, setReport] = useState<null | "form" | "sending" | "failed" | "thanks">(null);
  const [reason, setReason] = useState<ReportReason>("inappropriate");
  const [toast, setToast] = useState<null | "downloading" | "saved" | "failed">(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState<Record<string, boolean>>({});

  const zoom = useRef({ s: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<null | { x: number; y: number; tx: number; ty: number }>(null);
  const mode = useRef<null | "swipe" | "dismiss" | "pan" | "pinch" | "pinchdone">(null);
  const pinch0 = useRef<{ d: number; m: { x: number; y: number }; s: number; tx: number; ty: number } | null>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const timers = useRef<{ hide?: number; tap?: number; go?: number; toast?: number }>({});
  const closing = useRef(false);
  const busy = useRef(false);

  const item = items[index];
  const prev = items[index - 1];
  const next = items[index + 1];
  const { W, H } = size;

  const dimsOf = useCallback(
    (it: ViewerItem | undefined) => {
      if (!it) return { w: 4, h: 5 };
      if (it.width && it.height) return { w: it.width, h: it.height };
      const n = natural[it.id];
      if (n) return n;
      return { w: ratioOf(it) * 1000, h: 1000 };
    },
    [natural],
  );
  const fit = useCallback(
    (it: ViewerItem | undefined): Rect => {
      if (!it) return { x: 0, y: 0, w: W, h: H };
      const d = dimsOf(it);
      const scale = Math.min(W / d.w, H / d.h);
      const w = d.w * scale;
      const h = d.h * scale;
      return { x: (W - w) / 2, y: (H - h) / 2, w, h };
    },
    [W, H, dimsOf],
  );

  const clearTimer = (key: keyof typeof timers.current) => {
    const id = timers.current[key];
    if (id) window.clearTimeout(id);
    timers.current[key] = undefined;
  };

  const armHide = useCallback(() => {
    clearTimer("hide");
    timers.current.hide = window.setTimeout(() => setControls(false), HIDE_AFTER_MS);
  }, []);

  // ── open: grow out of the thumbnail ──
  useLayoutEffect(() => {
    const cur = curRef.current;
    const bg = bgRef.current;
    if (!cur || !bg) return;
    const f = fit(item);
    const rm = reducedMotion();
    cur.style.transition = "none";
    bg.style.transition = "none";
    bg.style.opacity = "0";
    cur.style.transformOrigin = "0 0";
    if (rm || !origin) {
      cur.style.opacity = "0";
      cur.style.transform = "none";
    } else {
      cur.style.transform = `translate(${origin.x - f.x}px,${origin.y - f.y}px) scale(${origin.w / f.w})`;
    }
    cur.getBoundingClientRect();
    const raf = requestAnimationFrame(() => {
      bg.style.transition = `opacity ${rm ? 200 : 260}ms ease-out`;
      bg.style.opacity = "1";
      cur.style.transition = rm ? "opacity 200ms ease-out" : `transform 320ms ${EASE}`;
      cur.style.opacity = "1";
      cur.style.transform = "none";
    });
    rootRef.current?.focus({ preventScroll: true });
    armHide();
    return () => cancelAnimationFrame(raf);
    // Only on mount: later index changes slide, they do not grow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock the page behind the viewer; follow the window's size.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onResize = () => setSize({ W: window.innerWidth, H: window.innerHeight });
    window.addEventListener("resize", onResize);
    const t = timers.current;
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("resize", onResize);
      Object.values(t).forEach((id) => id && window.clearTimeout(id));
    };
  }, []);

  // A new photo: the track and the zoom start from rest.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track) {
      track.style.transition = "none";
      track.style.transform = "none";
    }
    zoom.current = { s: 1, tx: 0, ty: 0 };
    const cur = curRef.current;
    if (cur && !closing.current) {
      cur.style.transition = "none";
      cur.style.transform = "none";
    }
  }, [index]);

  const applyZoom = (animate: boolean) => {
    const cur = curRef.current;
    if (!cur) return;
    const z = zoom.current;
    cur.style.transformOrigin = "0 0";
    cur.style.transition = animate ? `transform 300ms ${EASE}` : "none";
    cur.style.transform = z.s === 1 && !z.tx && !z.ty ? "none" : `translate(${z.tx}px,${z.ty}px) scale(${z.s})`;
  };
  const resetZoom = (animate: boolean) => {
    zoom.current = { s: 1, tx: 0, ty: 0 };
    applyZoom(animate);
  };
  // Panning stops at the photo's edges; a photo smaller than the screen stays centred.
  const clampZoom = (animate: boolean) => {
    const f = fit(item);
    const z = zoom.current;
    const sw = f.w * z.s;
    const sh = f.h * z.s;
    z.tx = sw <= W ? (W - sw) / 2 - f.x : Math.min(-f.x, Math.max(W - f.x - sw, z.tx));
    z.ty = sh <= H ? (H - sh) / 2 - f.y : Math.min(-f.y, Math.max(H - f.y - sh, z.ty));
    applyZoom(animate);
  };
  const zoomAt = (q: { x: number; y: number }, animate: boolean) => {
    const f = fit(item);
    const s = 2.5;
    zoom.current = { s, tx: (q.x - f.x) * (1 - s), ty: (q.y - f.y) * (1 - s) };
    clampZoom(animate);
  };

  const resetVideo = () => {
    setStarted(false);
    setPlaying(false);
    setTime(0);
    setVideoDuration(null);
  };

  const snapTrack = () => {
    const track = trackRef.current;
    if (track) {
      track.style.transition = `transform 280ms ${EASE}`;
      track.style.transform = "translateX(0)";
    }
  };

  const go = (direction: number) => {
    const target = index + direction;
    const track = trackRef.current;
    const cur = curRef.current;
    if (target < 0 || target >= items.length || busy.current) {
      snapTrack();
      return;
    }
    resetZoom(false);
    resetVideo();
    busy.current = true;
    if (reducedMotion() || !track || !cur) {
      if (cur) {
        cur.style.transition = "opacity 120ms ease-out";
        cur.style.opacity = "0";
      }
      timers.current.go = window.setTimeout(() => {
        onIndex(target);
        busy.current = false;
        requestAnimationFrame(() => {
          if (!curRef.current) return;
          curRef.current.style.transition = "opacity 180ms ease-out";
          curRef.current.style.opacity = "1";
        });
      }, 120);
      return;
    }
    track.style.transition = `transform 300ms ${EASE}`;
    track.style.transform = `translateX(${-direction * (W + SLIDE_GAP)}px)`;
    clearTimer("go");
    timers.current.go = window.setTimeout(() => {
      busy.current = false;
      onIndex(target);
    }, 300);
  };

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    videoRef.current?.pause();
    clearTimer("hide");
    const cur = curRef.current;
    const bg = bgRef.current;
    const rm = reducedMotion();
    const f = fit(item);
    const target = rm ? null : originFor(index);
    if (bg) {
      bg.style.transition = "opacity 240ms ease-out";
      bg.style.opacity = "0";
    }
    if (cur) {
      cur.style.transformOrigin = "0 0";
      if (target) {
        cur.style.transition = `transform 300ms ${EASE}`;
        cur.style.transform = `translate(${target.x - f.x}px,${target.y - f.y}px) scale(${target.w / f.w})`;
      } else {
        cur.style.transition = "opacity 200ms ease-out";
        cur.style.opacity = "0";
      }
    }
    setControls(false);
    setReport(null);
    window.setTimeout(onClose, rm ? 210 : 310);
  }, [fit, index, item, onClose, originFor]);

  // Keys: arrows browse, Esc closes the report first, then the viewer.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (report) setReport(null);
        else close();
        return;
      }
      if (report) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── gestures ──
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button,[data-nodrag]") || report) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* some browsers refuse capture on synthetic pointers */
    }
    const p = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, p);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      mode.current = "pinch";
      pinch0.current = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        ...zoom.current,
      };
      return;
    }
    gesture.current = { x: p.x, y: p.y, tx: zoom.current.tx, ty: zoom.current.ty };
    mode.current = null;
    last.current = { x: p.x, y: p.y, t: performance.now() };
    velocity.current = { x: 0, y: 0 };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const p = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, p);

    if (mode.current === "pinch" && pointers.current.size === 2 && pinch0.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const p0 = pinch0.current;
      const s = Math.max(1, Math.min(4, (p0.s * d) / p0.d));
      const f = fit(item);
      const lx = (p0.m.x - f.x - p0.tx) / p0.s;
      const ly = (p0.m.y - f.y - p0.ty) / p0.s;
      zoom.current = { s, tx: m.x - f.x - lx * s, ty: m.y - f.y - ly * s };
      applyZoom(false);
      return;
    }
    const g0 = gesture.current;
    if (!g0 || mode.current === "pinchdone") return;
    const dx = p.x - g0.x;
    const dy = p.y - g0.y;
    const now = performance.now();
    const dt = Math.max(1, now - last.current.t);
    velocity.current = { x: (p.x - last.current.x) / dt, y: (p.y - last.current.y) / dt };
    last.current = { x: p.x, y: p.y, t: now };

    if (!mode.current) {
      if (Math.hypot(dx, dy) < 8) return;
      mode.current = zoom.current.s > 1.01 ? "pan" : Math.abs(dx) > Math.abs(dy) ? "swipe" : dy > 0 ? "dismiss" : "swipe";
      if (mode.current === "dismiss") setControls(false);
    }
    if (mode.current === "swipe") {
      const track = trackRef.current;
      if (!track) return;
      let d = dx;
      // Resistance past the first and the last photo.
      if ((d > 0 && index === 0) || (d < 0 && index === items.length - 1)) d *= 0.35;
      track.style.transition = "none";
      track.style.transform = `translateX(${d}px)`;
    }
    if (mode.current === "dismiss") {
      const cur = curRef.current;
      const bg = bgRef.current;
      if (!cur || !bg) return;
      const f = fit(item);
      const yy = Math.max(0, dy);
      const s = reducedMotion() ? 1 : 1 - Math.min(yy / 1400, 0.35);
      cur.style.transition = "none";
      cur.style.transformOrigin = "0 0";
      cur.style.transform = `translate(${dx + ((1 - s) * f.w) / 2}px,${yy + ((1 - s) * f.h) / 2}px) scale(${s})`;
      bg.style.transition = "none";
      bg.style.opacity = String(1 - Math.min(yy / 320, 0.85));
    }
    if (mode.current === "pan") {
      zoom.current.tx = g0.tx + dx;
      zoom.current.ty = g0.ty + dy;
      applyZoom(false);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const p = { x: event.clientX, y: event.clientY };
    pointers.current.delete(event.pointerId);

    if (mode.current === "pinch") {
      if (pointers.current.size < 2) {
        if (zoom.current.s < 1.05) resetZoom(true);
        else clampZoom(true);
        mode.current = pointers.current.size ? "pinchdone" : null;
      }
      return;
    }
    if (mode.current === "pinchdone") {
      if (!pointers.current.size) mode.current = null;
      return;
    }
    const g0 = gesture.current;
    if (!g0) return;
    const dx = p.x - g0.x;
    const dy = p.y - g0.y;
    const { x: vx, y: vy } = velocity.current;

    if (!mode.current) {
      const now = performance.now();
      if (now - lastTap.current < 280) {
        // Double tap: zoom in where tapped, or back out.
        clearTimer("tap");
        lastTap.current = 0;
        if (zoom.current.s > 1.01) resetZoom(!reducedMotion());
        else zoomAt(p, !reducedMotion());
        setControls(false);
      } else {
        lastTap.current = now;
        clearTimer("tap");
        timers.current.tap = window.setTimeout(() => {
          setControls((shown) => {
            if (!shown) armHide();
            return !shown;
          });
        }, 280);
      }
      gesture.current = null;
      return;
    }
    if (mode.current === "swipe") {
      if ((dx < -W * 0.18 || vx < -0.45) && index < items.length - 1) go(1);
      else if ((dx > W * 0.18 || vx > 0.45) && index > 0) go(-1);
      else snapTrack();
    }
    if (mode.current === "dismiss") {
      if (dy > 110 || vy > 0.6) close();
      else {
        const cur = curRef.current;
        const bg = bgRef.current;
        if (cur) {
          cur.style.transition = `transform 300ms ${EASE}`;
          cur.style.transform = "none";
        }
        if (bg) {
          bg.style.transition = "opacity 240ms ease-out";
          bg.style.opacity = "1";
        }
        setControls(true);
        armHide();
      }
    }
    if (mode.current === "pan") clampZoom(true);
    mode.current = null;
    gesture.current = null;
  };

  const onMouseMove = () => {
    if (!controls) setControls(true);
    armHide();
  };

  // ── actions ──
  const play = () => {
    setStarted(true);
    setPlaying(true);
    armHide();
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => setPlaying(false));
    });
  };
  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
    setControls(true);
  };

  const download = async () => {
    if (!item) return;
    clearTimer("toast");
    setToast("downloading");
    const ok = await onDownload(item.id);
    setToast(ok ? "saved" : "failed");
    timers.current.toast = window.setTimeout(() => setToast(null), 1800);
  };

  const openReport = () => {
    clearTimer("hide");
    setReason("inappropriate");
    setReport("form");
    setControls(true);
  };
  const closeReport = () => {
    setReport(null);
    armHide();
  };
  const sendReport = async () => {
    if (!item || report === "sending") return;
    setReport("sending");
    const ok = await onReport(item.id, reason);
    setReport(ok ? "thanks" : "failed");
  };

  if (!item) return null;

  const showControls = controls || Boolean(report);
  const reported = reportedIds.includes(item.id);
  const duration = item.duration ?? videoDuration;
  const durationLabel = formatDuration(duration);
  const label = item.message
    ? item.from
      ? t(g.messageLabel, { name: item.from })
      : vs.messagesTitle
    : t(item.video ? g.videoLabel : g.photoLabel, { n: index + 1, total: items.length });
  const counter = `${index + 1} / ${items.length}`;
  const learn = (id: string) => (event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    const el = event.currentTarget;
    const w = "naturalWidth" in el ? el.naturalWidth : el.videoWidth;
    const h = "naturalHeight" in el ? el.naturalHeight : el.videoHeight;
    if (w && h && !natural[id]) setNatural((current) => ({ ...current, [id]: { w, h } }));
  };

  const slide = (k: -1 | 1, it: ViewerItem | undefined) => {
    if (!it) return null;
    const f = fit(it);
    const src = it.video ? it.thumb : (it.preview ?? it.thumb);
    return (
      <div className="absolute top-0" style={{ left: k * (W + SLIDE_GAP), width: W, height: H }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={learn(it.id)}
            className="absolute bg-night-2 object-cover"
            style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
          />
        ) : null}
      </div>
    );
  };

  const f = fit(item);
  const repDesk = !mobile;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseMove={onMouseMove}
      className={cn(
        fontClassName,
        "gallery-otisak fixed inset-0 z-[var(--z-modal)] select-none overflow-hidden text-night-ink outline-none [touch-action:none]",
      )}
    >
      <div ref={bgRef} className="absolute inset-0 bg-night" />
      <div ref={trackRef} className="absolute inset-0">
        {slide(-1, prev)}
        <div ref={curRef} className="absolute will-change-transform" style={{ left: f.x, top: f.y, width: f.w, height: f.h }}>
          {item.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`t-${item.id}`}
              src={item.thumb}
              alt={item.video ? "" : label}
              draggable={false}
              onLoad={learn(item.id)}
              className="absolute inset-0 block h-full w-full bg-night-2 object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-night-2" />
          )}
          {!item.video && item.preview && item.preview !== item.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`p-${item.id}`}
              src={item.preview}
              alt={item.thumb ? "" : label}
              draggable={false}
              onLoad={(event) => {
                learn(item.id)(event);
                setPreviewLoaded((current) => ({ ...current, [item.id]: true }));
              }}
              className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-[240ms] ease-out"
              style={{ opacity: previewLoaded[item.id] || !item.thumb ? 1 : 0 }}
            />
          ) : null}
          {item.video && started && item.preview ? (
            <video
              key={`v-${item.id}`}
              ref={videoRef}
              src={item.preview}
              poster={item.thumb ?? undefined}
              playsInline
              onLoadedMetadata={(event) => {
                learn(item.id)(event);
                const d = event.currentTarget.duration;
                if (Number.isFinite(d)) setVideoDuration(d);
              }}
              onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
              onEnded={() => {
                setPlaying(false);
                setStarted(false);
                setTime(0);
                setControls(true);
              }}
              className="absolute inset-0 h-full w-full bg-night object-contain"
            />
          ) : null}
          {!item.thumb && !item.preview ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-night-2 p-6 text-center">
              <AlertIcon className="h-7 w-7" />
              <p className="m-0 font-display text-[22px] font-semibold leading-tight">{g.failedTitle}</p>
              <p className="m-0 max-w-[28ch] text-[15px] text-night-muted">{g.failedBody}</p>
            </div>
          ) : null}
        </div>
        {slide(1, next)}
      </div>

      {item.video && !playing ? (
        <button
          type="button"
          onClick={play}
          className="absolute left-1/2 top-1/2 z-[3] flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-2.5 border-0 bg-transparent p-0 text-night-ink"
        >
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-night-ink/35 bg-night/60">
            <PlayIcon className="ml-[3px] h-[30px] w-[30px]" />
          </span>
          <span className="rounded-full bg-night/60 px-3 py-1 text-sm font-semibold">
            {durationLabel ? `${g.play}, ${durationLabel}` : g.play}
          </span>
        </button>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 z-[4] transition-opacity duration-[220ms] ease-out"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 flex items-center justify-between gap-2",
            mobile ? "px-3 pt-[calc(env(safe-area-inset-top)+8px)]" : "px-6 pt-5",
          )}
        >
          <button type="button" data-nodrag onClick={close} className={cn(pill, "pl-3 pr-4")} style={{ pointerEvents: showControls ? "auto" : "none" }}>
            <CloseIcon className="h-[18px] w-[18px]" />
            {vs.close}
          </button>
          <span aria-live="polite" className="inline-flex min-h-8 items-center rounded-full bg-night-2/80 px-3 text-[15px] font-semibold">
            {counter}
          </span>
          <button type="button" data-nodrag onClick={download} className={cn(pill, "pl-3 pr-4")} style={{ pointerEvents: showControls ? "auto" : "none" }}>
            <DownloadIcon className="h-[18px] w-[18px]" />
            {vs.download}
          </button>
        </div>

        {!mobile && prev ? (
          <button
            type="button"
            data-nodrag
            onClick={() => go(-1)}
            className={cn(pill, "absolute left-5 top-1/2 min-h-12 -translate-y-1/2 pl-3 pr-[18px]")}
            style={{ pointerEvents: showControls ? "auto" : "none" }}
          >
            <ChevronLeft />
            {vs.previous}
          </button>
        ) : null}
        {!mobile && next ? (
          <button
            type="button"
            data-nodrag
            onClick={() => go(1)}
            className={cn(pill, "absolute right-5 top-1/2 min-h-12 -translate-y-1/2 pl-[18px] pr-3")}
            style={{ pointerEvents: showControls ? "auto" : "none" }}
          >
            {vs.next}
            <ChevronRight />
          </button>
        ) : null}

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-3",
            mobile ? "px-3 pb-[calc(env(safe-area-inset-bottom)+8px)]" : "px-6 pb-5",
          )}
        >
          {item.video && playing ? (
            <div className="mx-auto box-border flex w-full max-w-[720px] items-center gap-3">
              <button
                type="button"
                data-nodrag
                onClick={pause}
                className={cn(pill, "flex-none gap-1 pl-2.5 pr-3.5 text-sm")}
                style={{ pointerEvents: showControls ? "auto" : "none" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 6v12M15 6v12" />
                </svg>
                {g.pause}
              </button>
              <span className="min-w-[34px] flex-none text-[13px] font-semibold">{formatDuration(time)}</span>
              <div
                data-nodrag
                className="h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-night-ink/25"
                style={{ pointerEvents: showControls ? "auto" : "none" }}
                onClick={(event) => {
                  const video = videoRef.current;
                  if (!video || !duration) return;
                  const box = event.currentTarget.getBoundingClientRect();
                  video.currentTime = ((event.clientX - box.left) / box.width) * duration;
                }}
              >
                <div className="h-full bg-night-ink" style={{ width: duration ? `${Math.min(100, (time / duration) * 100)}%` : "0%" }} />
              </div>
              <span className="flex-none text-[13px] font-semibold text-night-muted">{durationLabel}</span>
            </div>
          ) : null}
          <div className="flex min-h-11 items-center justify-between gap-3">
            {!item.message && !reported ? (
              <button
                type="button"
                data-nodrag
                onClick={openReport}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent pl-2 pr-3 text-sm font-semibold text-night-muted transition-colors hover:text-night-ink"
                style={{ pointerEvents: showControls ? "auto" : "none" }}
              >
                <FlagIcon />
                {vs.report}
              </button>
            ) : null}
            {!item.message && reported ? (
              <span className="inline-flex min-h-11 items-center gap-1.5 pl-2 pr-3 text-sm font-semibold text-moss-night">
                <CheckIcon className="h-[18px] w-[18px]" />
                {g.reported}
              </span>
            ) : null}
            {item.message && item.from ? (
              <span className="rounded-full bg-night-2/80 px-3.5 py-1 font-display text-lg italic">
                {t(vs.messageFrom, { name: item.from })}
              </span>
            ) : null}
            {!mobile ? <span className="text-[13px] text-night-muted">{g.keysHint}</span> : null}
            <span className="w-11" />
          </div>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className={cn(
            "absolute left-1/2 z-[6] inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-night-ink/15 bg-night-2 px-4 py-2.5 text-sm font-semibold",
            toast === "saved" ? "text-moss-night" : toast === "failed" ? "text-accent-light" : "text-night-ink",
            mobile ? "top-[calc(env(safe-area-inset-top)+60px)]" : "top-[84px]",
          )}
        >
          {toast === "saved" ? <CheckIcon className="h-[18px] w-[18px]" /> : null}
          {toast === "downloading" ? g.downloading : toast === "saved" ? g.saved : vs.downloadFailed}
        </div>
      ) : null}

      {report ? (
        <>
          <div data-nodrag onClick={closeReport} className="absolute inset-0 z-[8] bg-night/55" />
          <div
            data-nodrag
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-report-title"
            className={cn(
              "absolute z-[9] box-border bg-night-2 px-5 pt-2 text-night-ink shadow-night",
              repDesk
                ? "left-1/2 top-1/2 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl pb-6"
                : "inset-x-0 bottom-0 rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+20px)]",
            )}
          >
            {mobile ? <div className="mx-auto mb-3.5 h-[5px] w-9 rounded-full bg-night-ink/25" /> : null}
            {report !== "thanks" ? (
              <>
                <div className={repDesk ? "pt-4" : ""}>
                  <p id="gallery-report-title" className="m-0 font-display text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                    {vs.reportTitle}
                  </p>
                  <p className="mt-1.5 text-sm leading-[1.45] text-night-muted">{g.reportBody}</p>
                </div>
                <div role="radiogroup" aria-labelledby="gallery-report-title" className="mt-3">
                  {REASONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={reason === key}
                      onClick={() => setReason(key)}
                      className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 border-0 border-t border-solid border-night-ink/12 bg-transparent p-0 text-left text-base font-medium text-night-ink"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "box-border flex h-5 w-5 flex-none items-center justify-center rounded-full border-[1.5px] border-solid",
                          reason === key ? "border-accent-light" : "border-night-ink/60",
                        )}
                      >
                        {reason === key ? <span className="h-2.5 w-2.5 rounded-full bg-accent-light" /> : null}
                      </span>
                      <span>{vs.reportReasons[key]}</span>
                    </button>
                  ))}
                </div>
                {report === "failed" ? (
                  <p role="alert" className="mt-2 flex items-center gap-2 text-sm font-semibold text-accent-light">
                    <AlertIcon className="h-[18px] w-[18px]" />
                    {vs.reportFailed}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={sendReport}
                    aria-busy={report === "sending"}
                    className={cn(
                      "min-h-[52px] cursor-pointer rounded-full border-0 bg-accent text-base font-semibold text-accent-ink",
                      report === "sending" && "opacity-70",
                    )}
                  >
                    {report === "sending" ? g.reportSending : vs.reportSend}
                  </button>
                  <button
                    type="button"
                    onClick={closeReport}
                    className="min-h-12 cursor-pointer rounded-full border-0 bg-transparent text-[15px] font-semibold text-night-ink"
                  >
                    {vs.reportCancel}
                  </button>
                </div>
              </>
            ) : (
              <div role="status" className={cn("flex flex-col items-center text-center", repDesk ? "px-2 pt-6" : "pt-2")}>
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-solid border-moss-night text-moss-night">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <p className="mt-3.5 font-display text-[22px] font-semibold leading-tight">{vs.reportThanks}</p>
                <p className="mt-2 max-w-[30ch] text-sm leading-[1.45] text-night-muted">{g.reportThanksBody}</p>
                <button
                  type="button"
                  onClick={closeReport}
                  className="mt-5 min-h-12 w-full cursor-pointer rounded-full border border-solid border-night-ink/40 bg-transparent text-[15px] font-semibold text-night-ink"
                >
                  {vs.close}
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
