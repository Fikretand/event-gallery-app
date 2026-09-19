"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Sprite, TimelineContext } from "./animations";
import { PaperBackground } from "./visuals";
import * as DesktopScenes from "./scenes";
import * as MobileScenes from "./scenes-mobile";

const DURATION = 52;

// Representative still shown when the user prefers reduced motion.
const REDUCED_MOTION_FRAME = 33; // gallery wall — "Svaki trenutak"

const DIMS = {
  desktop: { w: 1920, h: 1080 },
  mobile: { w: 1080, h: 1920 },
} as const;

type Mode = "desktop" | "mobile";

type SceneFn = () => ReactNode;
interface SceneModule {
  SceneWrap: (p: { children?: ReactNode; fadeIn?: number; fadeOut?: number }) => ReactNode;
  WideScene: SceneFn;
  UploadScene: SceneFn;
  GalleryScene: SceneFn;
  EventTypesScene: SceneFn;
  OutroScene: SceneFn;
}

const DESKTOP = DesktopScenes as unknown as SceneModule;
const MOBILE = MobileScenes as unknown as SceneModule;

const SCHEDULE: { key: keyof SceneModule; start: number; end: number }[] = [
  { key: "WideScene", start: 0, end: 19 },
  { key: "UploadScene", start: 19, end: 29 },
  { key: "GalleryScene", start: 29, end: 39 },
  { key: "EventTypesScene", start: 39, end: 47 },
  { key: "OutroScene", start: 47, end: 52 },
];

function SceneTree({ mod }: { mod: SceneModule }) {
  const Wrap = mod.SceneWrap;
  return (
    <>
      <PaperBackground />
      {SCHEDULE.map((sc, i) => {
        const Component = mod[sc.key] as SceneFn;
        return (
          <Sprite key={i} start={sc.start} end={sc.end}>
            <Wrap fadeIn={0.4} fadeOut={0.4}>
              <div style={{ position: "absolute", inset: 0 }}>
                <Component />
              </div>
            </Wrap>
          </Sprite>
        );
      })}
    </>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getReducedMotionOnServer = () => false;

export function ConfettiExplainer() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [scale, setScale] = useState(0);
  const [time, setTime] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inViewRef = useRef(false);
  // `ctx` reads this during render, so it cannot live in a ref. Subscribing to
  // the media query keeps it SSR-safe, avoids a cascading render, and lets the
  // animation react live if the OS setting is toggled.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionOnServer,
  );

  // Pick portrait (mobile) vs landscape (desktop) layout.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMode(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Mount slightly before the section enters view so images can preload.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scale the fixed canvas to the container width (depends on the active mode).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !mode) return;
    const w = DIMS[mode].w;
    const measure = () => setScale(el.clientWidth / w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // Drive the timeline only while in view (and not reduced-motion).
  useEffect(() => {
    if (!mounted) return;

    // Reduced motion: never start the clock. The frame shown is derived
    // below rather than written into state.
    if (reducedMotion) return;

    const el = wrapRef.current;
    let raf = 0;
    let last: number | null = null;

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) last = null;
      },
      { threshold: 0.2 },
    );
    if (el) io.observe(el);

    const loop = (ts: number) => {
      if (inViewRef.current) {
        if (last == null) last = ts;
        const dt = (ts - last) / 1000;
        last = ts;
        setTime((t) => (t + dt) % DURATION);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [mounted, reducedMotion]);

  // Derived, not stored: with reduced motion we simply render a
  // representative still instead of driving `time`.
  const displayTime = reducedMotion ? REDUCED_MOTION_FRAME : time;

  const ctx = useMemo(
    () => ({ time: displayTime, duration: DURATION, playing: !reducedMotion, setTime, setPlaying: () => {} }),
    [displayTime, reducedMotion],
  );

  const dims = mode ? DIMS[mode] : DIMS.desktop;
  const sceneMod = mode === "mobile" ? MOBILE : DESKTOP;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${dims.w} / ${dims.h}`,
        overflow: "hidden",
        borderRadius: 24,
        background: "#f2eadf",
      }}
    >
      {mounted && mode && scale > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: dims.w,
            height: dims.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            overflow: "hidden",
          }}
        >
          <TimelineContext.Provider value={ctx}>
            <SceneTree mod={sceneMod} />
          </TimelineContext.Provider>
        </div>
      )}
    </div>
  );
}

export default ConfettiExplainer;
