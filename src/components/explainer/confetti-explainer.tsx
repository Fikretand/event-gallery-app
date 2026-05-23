"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Sprite, TimelineContext } from "./animations";
import { PaperBackground } from "./visuals";
import {
  SceneWrap,
  WideScene,
  UploadScene,
  GalleryScene,
  EventTypesScene,
  OutroScene,
} from "./scenes";

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const DURATION = 52;

// Representative still shown when the user prefers reduced motion.
const REDUCED_MOTION_FRAME = 33; // gallery wall — "Svaki trenutak"

const SCENES: { Component: () => ReactNode; start: number; end: number }[] = [
  { Component: WideScene, start: 0, end: 19 },
  { Component: UploadScene, start: 19, end: 29 },
  { Component: GalleryScene, start: 29, end: 39 },
  { Component: EventTypesScene, start: 39, end: 47 },
  { Component: OutroScene, start: 47, end: 52 },
];

function SceneTree() {
  return (
    <>
      <PaperBackground />
      {SCENES.map((sc, i) => (
        <Sprite key={i} start={sc.start} end={sc.end}>
          <SceneWrap fadeIn={0.4} fadeOut={0.4}>
            <div style={{ position: "absolute", inset: 0 }}>
              <sc.Component />
            </div>
          </SceneWrap>
        </Sprite>
      ))}
    </>
  );
}

export function ConfettiExplainer() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [time, setTime] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inViewRef = useRef(false);
  const reduceRef = useRef(false);

  // Scale the fixed 1920×1080 canvas to the container width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / CANVAS_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
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

  // Drive the timeline only while in view (and not reduced-motion).
  useEffect(() => {
    if (!mounted) return;

    reduceRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceRef.current) {
      setTime(REDUCED_MOTION_FRAME);
      return;
    }

    const el = wrapRef.current;
    let raf = 0;
    let last: number | null = null;

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) last = null; // reset delta when paused
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
  }, [mounted]);

  const ctx = useMemo(
    () => ({ time, duration: DURATION, playing: !reduceRef.current, setTime, setPlaying: () => {} }),
    [time],
  );

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
        overflow: "hidden",
        borderRadius: 24,
        background: "#f2eadf",
      }}
    >
      {mounted && scale > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            overflow: "hidden",
          }}
        >
          <TimelineContext.Provider value={ctx}>
            <SceneTree />
          </TimelineContext.Provider>
        </div>
      )}
    </div>
  );
}

export default ConfettiExplainer;
