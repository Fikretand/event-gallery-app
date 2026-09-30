"use client";

/* eslint-disable @next/next/no-img-element -- decorative thumbnails inside a
   scaled mock-UI canvas; next/image's sizing and lazy wrapper would only get in
   the way of the fixed 480×380 drawing. */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from "react";

import type { Dict } from "@/lib/i18n/index";

/**
 * The landing's "How it works": a step switcher beside a dark stage in which
 * each step plays a small scene — an event being created, a guest scanning the
 * QR, uploads being approved, the gallery being shared and downloaded.
 *
 * Ported from the Claude Design handoff "How It Works.dc.html". Each scene is
 * drawn on a fixed 480×380 canvas and scaled to the stage, so every position
 * below is in those design pixels. A scene is a list of checkpoints (`SCHED`);
 * `ph` counts how many have passed and every style is a pure function of it,
 * so CSS transitions do the animating and reduced motion simply jumps to the
 * last checkpoint.
 *
 * Nothing runs until the section is on screen, and everything stops when it
 * leaves.
 */

type Copy = Dict["landing"]["howItWorks"];

const IMG = "/explainer/assets/";
const STEP_MS = 4600;
const SERIF = "var(--font-display)";
const MONO = "var(--font-jetbrains), ui-monospace, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
const SPRING = "cubic-bezier(.34,1.56,.64,1)";

// Checkpoint times (ms from step start) per scene; phase = checkpoints passed.
const SCHED = [
  [1500, 1900, 2400, 2750], // date chip, PIN on, press, success
  [200, 800, 1700, 2150], // phone in, scan, upload page, thumbs fly
  [400, 750, 1150, 1500, 1900, 2250, 2750], // cursor/approve ×2, cursor/remove, cursor away
  [700, 1300, 1900, 3000], // copied, gallery, downloading, done
];
const TYPE_START = 300;
const TYPE_STEP = 40;

const FLY_SRC = ["party-2.webp", "phone-kids.webp", "gallery-cake-1.webp"];
const FLY = [
  [-105, -270, -8],
  [-25, -285, 5],
  [55, -262, 11],
];
const TILE_SRC = ["gallery-toasts-1.webp", "phone-dance.webp", "phone-nana.webp", "party-4.webp", "party-2.webp", "phone-kids.webp"];
const GAL_SRC = ["gallery-ceremony-2.webp", "gallery-cake-1.webp", "gallery-toasts-1.webp", "phone-nana.webp", "phone-dance.webp"];
const ALL_IMAGES = Array.from(new Set([...FLY_SRC, ...TILE_SRC, ...GAL_SRC])).map((f) => IMG + f);

// Scene 3: tile grid and the cursor's stops.
const tilePos = (i: number) => ({ left: 20 + (i % 3) * 130, top: 70 + Math.floor(i / 3) * 118 });
const CURSOR = [
  [470, 390],
  [116, 152],
  [116, 152],
  [376, 152],
  [376, 152],
  [246, 270],
  [246, 270],
  [455, 372],
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const CONFETTI = (() => {
  const r = rng(42);
  const cols = ["#e27952", "#38584d", "#f6d3c3", "#172033", "#e9dccb", "#e27952"];
  return Array.from({ length: 36 }, (_, i) => {
    const a = ((-90 + (r() * 150 - 75)) * Math.PI) / 180;
    const dist = 90 + r() * 140;
    const round = r() > 0.7;
    const w = round ? 7 : 5 + r() * 3;
    const h = round ? 7 : 9 + r() * 5;
    return {
      dx: Math.cos(a) * dist,
      dy: Math.sin(a) * dist,
      rot: r() * 720 - 360,
      w,
      h,
      br: round ? "999px" : "2px",
      c: cols[i % cols.length],
      d: Math.round(r() * 90),
    };
  });
})();

type State = {
  active: number;
  shown: number;
  ph: number;
  typed: number;
  playing: boolean;
  prog: number;
  progMs: number;
  enter: boolean;
  burst: number;
  k: number;
};

const INITIAL: State = { active: 0, shown: 0, ph: 0, typed: 0, playing: true, prog: 0, progMs: 0, enter: false, burst: 0, k: 1 };

const Check = ({ size, width }: { size: number; width: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
);

const Lock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38584d" strokeWidth="2">
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 018 0v3" />
  </svg>
);

export function HowItWorks({ copy, qrSvg }: { copy: Copy; qrSvg: string }) {
  const [s, setS] = useState<State>(INITIAL);
  const patch = useCallback((p: Partial<State>) => setS((prev) => ({ ...prev, ...p })), []);

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tabEls = useRef<(HTMLButtonElement | null)[]>([]);
  const mTabEls = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const rafs = useRef<number[]>([]);
  const advance = useRef<number | undefined>(undefined);
  const touchX = useRef(0);
  const inView = useRef(false);
  const fired = useRef(false);
  const preloaded = useRef(false);
  const reduced = useRef(false);
  const playing = useRef(true);
  const active = useRef(0);
  const runStepRef = useRef<(i: number) => void>(() => {});

  const ui = copy.ui;
  const nameLen = ui.nameVal.length;

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    rafs.current.forEach(cancelAnimationFrame);
    clearTimeout(advance.current);
    timers.current = [];
    rafs.current = [];
  }, []);

  const runStep = useCallback(
    (i: number) => {
      clear();
      active.current = i;
      const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
      // Two frames, so the "before" styles are painted and the transition runs.
      const raf2 = (fn: () => void) => {
        rafs.current.push(requestAnimationFrame(() => rafs.current.push(requestAnimationFrame(fn))));
      };
      const n = SCHED[i].length;
      if (reduced.current) {
        patch({ active: i, shown: i, ph: n, typed: nameLen, enter: true, prog: 1, progMs: 0, burst: 0 });
        return;
      }
      const auto = playing.current;
      patch({ active: i, shown: -1, ph: 0, typed: 0, enter: false, prog: 0, progMs: 0, burst: 0 });
      raf2(() => {
        patch({ shown: i });
        raf2(() => patch({ enter: true, prog: 1, progMs: auto ? STEP_MS : 300 }));
      });
      SCHED[i].forEach((t, idx) => later(t, () => patch({ ph: idx + 1 })));
      if (i === 0) for (let c = 1; c <= nameLen; c++) later(TYPE_START + c * TYPE_STEP, () => patch({ typed: c }));
      // The confetti bursts once per page view, the first time step 4 completes.
      if (i === 3 && !fired.current) {
        later(SCHED[3][3] + 120, () => {
          fired.current = true;
          patch({ burst: 1 });
          raf2(() => patch({ burst: 2 }));
          later(750, () => patch({ burst: 3 }));
          later(2000, () => patch({ burst: 0 }));
        });
      }
      if (auto) advance.current = window.setTimeout(() => runStepRef.current((i + 1) % 4), STEP_MS);
    },
    [clear, patch, nameLen],
  );

  useEffect(() => {
    runStepRef.current = runStep;
  }, [runStep]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onMq = () => {
      reduced.current = mq.matches;
      if (inView.current) runStepRef.current(active.current);
    };
    mq.addEventListener("change", onMq);

    // The scenes are drawn at 480 px wide and scaled to whatever the stage is.
    const ro = new ResizeObserver(() => {
      const k = canvas.clientWidth / 480;
      setS((prev) => (Math.abs(k - prev.k) > 0.002 ? { ...prev, k } : prev));
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([e]) => {
        inView.current = e.isIntersecting;
        if (e.isIntersecting) {
          if (!preloaded.current) {
            preloaded.current = true;
            ALL_IMAGES.forEach((src) => {
              const img = new Image();
              img.decoding = "async";
              img.src = src;
            });
          }
          runStepRef.current(active.current);
        } else {
          clear();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(root);

    return () => {
      clear();
      ro.disconnect();
      io.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, [clear]);

  const select = (i: number) => {
    playing.current = false;
    patch({ playing: false });
    runStep(i);
  };
  const togglePlay = () => {
    if (playing.current) {
      clearTimeout(advance.current);
      playing.current = false;
      patch({ playing: false, prog: 1, progMs: 300 });
    } else {
      playing.current = true;
      patch({ playing: true });
      runStep((active.current + 1) % 4);
    }
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const map: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let j: number | null = null;
    if (e.key in map) j = (i + map[e.key] + 4) % 4;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = 3;
    if (j === null) return;
    e.preventDefault();
    select(j);
    const target = j;
    window.setTimeout(() => {
      // Only one of the two tab lists is displayed at a time.
      const wide = tabEls.current[target];
      (wide && wide.offsetParent ? wide : mTabEls.current[target])?.focus();
    });
  };
  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) select((s.active + (dx < 0 ? 1 : -1) + 4) % 4);
  };

  // ─── Derived values ────────────────────────────────────────────────
  const a = s.active;
  const pv = (i: number) => (s.shown === i ? s.ph : 0);
  const enterStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: s.enter ? 1 : 0,
    transform: `translateY(${s.enter ? 0 : 10}px)`,
    transition: `opacity 400ms ${EASE}, transform 500ms ${EASE}`,
  };

  const steps = copy.steps.map((st, i) => {
    const done = i < a;
    const act = i === a;
    return {
      ...st,
      n: "0" + (i + 1),
      act,
      done,
      numBg: act ? "#172033" : done ? "#e6f2ee" : "rgba(255,255,255,.7)",
      numFg: act ? "#fff" : "#38584d",
      numBd: act ? "#172033" : done ? "#e6f2ee" : "rgba(56,88,77,.25)",
      numS: act ? 1.06 : 1,
      titleC: act ? "#172033" : "rgba(23,32,51,.72)",
      bodyC: act ? "rgba(0,0,0,.62)" : "rgba(0,0,0,.55)",
    };
  });

  const numStyle = (st: (typeof steps)[number], size: number, font: number): CSSProperties => ({
    position: "relative",
    display: "flex",
    width: size,
    height: size,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    border: `1px solid ${st.numBd}`,
    background: st.numBg,
    color: st.numFg,
    fontFamily: SERIF,
    fontSize: font,
    fontWeight: 600,
    transform: `scale(${st.numS})`,
    transition: `transform 400ms ${SPRING}`,
  });

  const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e27952]";

  return (
    <section id="how-it-works" data-hiw="" ref={rootRef} className="shell" style={{ padding: "64px 0 80px", scrollMarginTop: 40 }}>
      <div style={{ maxWidth: "40rem", marginBottom: 40 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-moss)]">{copy.eyebrow}</p>
        <h2
          className="font-display"
          style={{ marginTop: 12, fontSize: "clamp(30px,4.2vw,42px)", lineHeight: 1.1, fontWeight: 600, letterSpacing: "-.02em", color: "#172033", textWrap: "balance" }}
        >
          {copy.title}
        </h2>
        <p style={{ marginTop: 14, fontSize: 16, lineHeight: "26px", color: "rgba(0,0,0,.6)", maxWidth: "34rem", textWrap: "pretty" }}>{copy.sub}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center", gap: 40 }}>
        {/* ─── Stage ───
            On wide screens its width is capped by the viewport height, so the
            whole stage fits under the sticky nav (76 px) with 20 px to spare
            above and below: stage = canvas + 68 px of chrome, canvas is
            380/480 of its width. */}
        <div
          className="min-[932px]:max-w-[max(440px,calc((100svh_-_184px)*1.2632_+_22px))]"
          style={{
            flex: "1.45 1 520px",
            minWidth: 0,
            borderRadius: 34,
            border: "1px solid rgba(34,51,76,.6)",
            background: "linear-gradient(160deg,#1e2d45,#172033)",
            padding: "0 10px 10px",
            boxShadow: "0 30px 80px rgba(18,24,38,.18)",
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 6px 12px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: ".06em", color: "rgba(255,255,255,.55)" }}>
                {`0${a + 1} / 04`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {copy.steps[a].title}
              </span>
            </div>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={s.playing ? copy.pause : copy.play}
              aria-pressed={!s.playing}
              className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/16 bg-white/[.06] p-0 text-white transition-colors hover:bg-white/[.14] ${focusRing}`}
            >
              {s.playing ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <rect x="2" y="1.5" width="2.6" height="9" rx="1" fill="currentColor" />
                  <rect x="7.4" y="1.5" width="2.6" height="9" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.6v8.8a.6.6 0 00.9.5l7-4.4a.6.6 0 000-1L3.9 1.1a.6.6 0 00-.9.5z" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>

          <div
            id="hiw-panel"
            role="tabpanel"
            aria-labelledby={`hiw-tab-${a}`}
            ref={canvasRef}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "480 / 380",
              borderRadius: 24,
              overflow: "hidden",
              background:
                "radial-gradient(ellipse at top left,rgba(226,121,82,.22),transparent 44%),radial-gradient(ellipse at bottom right,rgba(56,88,77,.12),transparent 40%),linear-gradient(160deg,rgba(255,252,248,.98),rgba(242,232,220,.9))",
            }}
          >
            <p className="sr-only">
              {copy.steps[a].title}. {copy.steps[a].body}
            </p>
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: 0, top: 0, width: 480, height: 380, transformOrigin: "0 0", transform: `scale(${s.k})` }}
            >
              {s.shown === 0 ? <SceneCreate ui={ui} p={pv(0)} typed={ui.nameVal.slice(0, s.typed)} enter={enterStyle} /> : null}
              {s.shown === 1 ? <SceneShare ui={ui} p={pv(1)} qrSvg={qrSvg} enter={enterStyle} /> : null}
              {s.shown === 2 ? <SceneCurate ui={ui} p={pv(2)} enter={enterStyle} /> : null}
              {s.shown === 3 ? <SceneDeliver ui={ui} p={pv(3)} burst={s.burst} enter={enterStyle} /> : null}
            </div>
          </div>
        </div>

        {/* ─── Switcher ─── */}
        <div style={{ flex: "1 1 340px", minWidth: 0 }}>
          {/* Wide: the four steps as a vertical list, a line filling between them. */}
          <div role="tablist" aria-label={copy.tablist} aria-orientation="vertical" className="hidden flex-col gap-1 min-[932px]:flex">
            {steps.map((st, i) => (
              <button
                key={st.n}
                type="button"
                role="tab"
                id={`hiw-tab-${i}`}
                aria-selected={st.act}
                aria-controls="hiw-panel"
                tabIndex={st.act ? 0 : -1}
                ref={(el) => {
                  tabEls.current[i] = el;
                }}
                onClick={() => select(i)}
                onKeyDown={(e) => onKey(e, i)}
                className={`cursor-pointer ${focusRing}`}
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "44px minmax(0,1fr)",
                  gap: 18,
                  width: "100%",
                  textAlign: "left",
                  padding: "20px 22px 20px 18px",
                  border: 0,
                  borderRadius: 22,
                  background: "transparent",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 22,
                    background: "rgba(255,255,255,.88)",
                    border: "1px solid rgba(0,0,0,.08)",
                    boxShadow: "0 16px 44px rgba(18,24,38,.10)",
                    opacity: st.act ? 1 : 0,
                    transition: `opacity 350ms ${EASE}`,
                  }}
                />
                <span aria-hidden="true" style={{ position: "relative", height: "100%" }}>
                  {i < 3 ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 21,
                        width: 2,
                        top: 50,
                        bottom: -40,
                        borderRadius: 2,
                        background: "rgba(56,88,77,.14)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          background: "#38584d",
                          transformOrigin: "top",
                          transform: `scaleY(${st.done ? 1 : 0})`,
                          transition: `transform 600ms ${EASE}`,
                        }}
                      />
                    </span>
                  ) : null}
                  <span style={numStyle(st, 44, 16)}>{st.n}</span>
                </span>
                <span style={{ position: "relative", minWidth: 0, paddingTop: 2 }}>
                  <span style={{ display: "block", fontSize: 17, lineHeight: "24px", fontWeight: 600, color: st.titleC }}>{st.title}</span>
                  {/* Only the active step shows its text, so the list stays
                      short enough to sit beside the stage on a laptop screen.
                      The 0fr → 1fr row animates the height. */}
                  <span
                    style={{
                      display: "grid",
                      gridTemplateRows: st.act ? "1fr" : "0fr",
                      opacity: st.act ? 1 : 0,
                      transition: `grid-template-rows 450ms ${EASE}, opacity 300ms ease-out`,
                    }}
                  >
                    <span style={{ display: "block", minHeight: 0, overflow: "hidden" }}>
                      <span style={{ display: "block", marginTop: 6, fontSize: 14, lineHeight: "22px", color: st.bodyC, textWrap: "pretty" }}>{st.body}</span>
                      <span
                        aria-hidden="true"
                        style={{ display: "block", marginTop: 14, height: 2, borderRadius: 2, background: "rgba(0,0,0,.06)", overflow: "hidden" }}
                      >
                        <span
                          style={{
                            display: "block",
                            width: "100%",
                            height: "100%",
                            background: "#e27952",
                            transformOrigin: "left",
                            transform: `scaleX(${st.act ? s.prog : 0})`,
                            transition: `transform ${st.act ? s.progMs : 0}ms linear`,
                          }}
                        />
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Narrow: four numbered dots on a line, the active step's text below. */}
          <div className="min-[932px]:hidden">
            <div role="tablist" aria-label={copy.tablist} style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 20,
                  left: "12.5%",
                  right: "12.5%",
                  height: 2,
                  borderRadius: 2,
                  background: "rgba(56,88,77,.14)",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    background: "#38584d",
                    transformOrigin: "left",
                    transform: `scaleX(${a / 3})`,
                    transition: `transform 600ms ${EASE}`,
                  }}
                />
              </span>
              {steps.map((st, i) => (
                <button
                  key={st.n}
                  type="button"
                  role="tab"
                  id={`hiw-mtab-${i}`}
                  aria-selected={st.act}
                  aria-controls="hiw-panel"
                  tabIndex={st.act ? 0 : -1}
                  ref={(el) => {
                    mTabEls.current[i] = el;
                  }}
                  onClick={() => select(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`cursor-pointer ${focusRing}`}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 7,
                    minHeight: 66,
                    padding: "0 2px 4px",
                    border: 0,
                    background: "transparent",
                    borderRadius: 14,
                  }}
                >
                  <span style={numStyle(st, 42, 15)}>{st.n}</span>
                  <span style={{ fontSize: 11.5, lineHeight: "14px", fontWeight: 600, color: st.titleC, textAlign: "center", overflowWrap: "anywhere" }}>
                    {st.label}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 18, minHeight: 150 }}>
              <p style={{ fontSize: 19, lineHeight: "26px", fontWeight: 600, color: "#172033" }}>{copy.steps[a].title}</p>
              <p style={{ marginTop: 6, fontSize: 15, lineHeight: "24px", color: "rgba(0,0,0,.62)", textWrap: "pretty" }}>{copy.steps[a].body}</p>
              <div aria-hidden="true" style={{ marginTop: 16, height: 2, borderRadius: 2, background: "rgba(0,0,0,.06)", overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    background: "#e27952",
                    transformOrigin: "left",
                    transform: `scaleX(${s.prog})`,
                    transition: `transform ${s.progMs}ms linear`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Ui = Copy["ui"];

// ─── Scene 1 · Create event ─────────────────────────────────────────
function SceneCreate({ ui, p, typed, enter }: { ui: Ui; p: number; typed: string; enter: CSSProperties }) {
  const label: CSSProperties = { fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,.55)" };
  return (
    <div style={enter}>
      <div
        style={{ position: "absolute", left: 104, top: 54, width: 280, height: 280, borderRadius: 24, background: "#efe5d8", border: "1px solid rgba(0,0,0,.05)", transform: "rotate(-4deg)" }}
      />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 40,
          width: 300,
          borderRadius: 24,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.08)",
          boxShadow: "0 16px 44px rgba(18,24,38,.12)",
          padding: "22px 22px 20px",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".24em", color: "#38584d" }}>{ui.newEvent}</p>
        <p style={{ ...label, marginTop: 14 }}>{ui.eventName}</p>
        <div
          style={{
            marginTop: 6,
            height: 42,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,.1)",
            background: "#fffdfa",
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            fontSize: 14,
            fontWeight: 500,
            color: "#172033",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span>{typed}</span>
          <span style={{ display: "inline-block", width: 1.5, height: 18, marginLeft: 1, background: "#e27952", opacity: p < 1 ? 1 : 0 }} />
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, height: 28 }}>
          <p style={label}>{ui.date}</p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              background: "#f2eadf",
              padding: "6px 11px",
              fontSize: 12,
              fontWeight: 600,
              color: "#172033",
              opacity: p >= 1 ? 1 : 0,
              transform: `scale(${p >= 1 ? 1 : 0.85})`,
              transformOrigin: "right center",
              transition: `opacity 300ms ease-out, transform 450ms ${SPRING}`,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38584d" strokeWidth="2">
              <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
              <path d="M8 2.5v4M16 2.5v4M3 11h18" />
            </svg>
            {ui.dateVal}
          </span>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, height: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={label}>{ui.pin}</p>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".12em",
                color: "#38584d",
                opacity: p >= 2 ? 1 : 0,
                transform: `translateX(${p >= 2 ? 0 : -6}px)`,
                transition: `opacity 300ms ease-out 150ms, transform 400ms ${EASE} 150ms`,
              }}
            >
              4821
            </span>
          </div>
          <span style={{ position: "relative", display: "block", width: 40, height: 24, borderRadius: 999, background: "rgba(0,0,0,.12)" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#38584d", opacity: p >= 2 ? 1 : 0, transition: "opacity 250ms ease-out" }} />
            <span
              style={{
                position: "absolute",
                left: 3,
                top: 3,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                transform: `translateX(${p >= 2 ? 16 : 0}px)`,
                transition: "transform 300ms cubic-bezier(.34,1.4,.64,1)",
              }}
            />
          </span>
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 20,
            height: 44,
            borderRadius: 999,
            background: "#e27952",
            overflow: "hidden",
            transform: `scale(${p === 3 ? 0.96 : 1})`,
            transition: "transform 200ms ease-out",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              opacity: p >= 4 ? 0 : 1,
              transition: "opacity 250ms ease-out",
            }}
          >
            {ui.create}
          </span>
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "#38584d",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              opacity: p >= 4 ? 1 : 0,
              transition: "opacity 300ms ease-out",
            }}
          >
            <Check size={15} width={2.6} />
            {ui.created}
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 366,
          top: 20,
          width: 48,
          height: 48,
          borderRadius: 999,
          background: "#38584d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 24px rgba(56,88,77,.35)",
          opacity: p >= 4 ? 1 : 0,
          transform: `scale(${p >= 4 ? 1 : 0.3})`,
          transition: `opacity 200ms ease-out, transform 500ms ${SPRING}`,
        }}
      >
        <Check size={22} width={2.6} />
      </div>
    </div>
  );
}

// ─── Scene 2 · Share the QR code ────────────────────────────────────
function SceneShare({ ui, p, qrSvg, enter }: { ui: Ui; p: number; qrSvg: string; enter: CSSProperties }) {
  const corner = (pos: CSSProperties): CSSProperties => ({ position: "absolute", width: 20, height: 20, ...pos });
  const edge = "2px solid rgba(255,255,255,.85)";
  const btnLayer: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10.5,
    fontWeight: 600,
    color: "#fff",
  };
  return (
    <div style={enter}>
      <div style={{ position: "absolute", left: 30, top: 318, width: 420, height: 28, borderRadius: "50%", background: "rgba(23,32,51,.07)" }} />
      <div style={{ position: "absolute", left: 80, top: 88, width: 172, height: 236, borderRadius: 18, background: "#e9dccb", transform: "rotate(4deg)" }} />
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 78,
          width: 176,
          height: 244,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.08)",
          boxShadow: "0 16px 44px rgba(18,24,38,.12)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "18px 16px 0",
        }}
      >
        <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: "#172033" }}>Amra &amp; Tarik</p>
        <p style={{ marginTop: 2, fontSize: 10, color: "rgba(0,0,0,.45)" }}>{ui.dateVal}</p>
        <div style={{ position: "relative", marginTop: 14, width: 116, height: 116 }}>
          <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <span
            style={{
              position: "absolute",
              left: -8,
              right: -8,
              top: 0,
              height: 2,
              borderRadius: 2,
              background: "#e27952",
              boxShadow: "0 0 12px 2px rgba(226,121,82,.55)",
              opacity: p === 2 ? 1 : 0,
              transform: `translateY(${p >= 2 ? 114 : 0}px)`,
              transition: "transform 700ms cubic-bezier(.65,0,.35,1), opacity 200ms ease-out",
            }}
          />
        </div>
        <p
          style={{
            marginTop: 14,
            fontSize: 8.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".14em",
            lineHeight: 1.35,
            textAlign: "center",
            color: "rgba(0,0,0,.45)",
          }}
        >
          {ui.scanLabel}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 292,
          top: 100,
          width: 136,
          height: 256,
          borderRadius: 28,
          background: "#141414",
          padding: 6,
          boxShadow: "0 24px 50px rgba(18,24,38,.3)",
          opacity: p >= 1 ? 1 : 0,
          transform: `translateX(${p >= 1 ? 0 : 150}px) rotate(${p >= 1 ? -5 : 8}deg)`,
          transition: `opacity 300ms ease-out, transform 600ms ${EASE}`,
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 22, overflow: "hidden", background: "#f9f5ef" }}>
          <span style={{ position: "absolute", left: "50%", top: 7, width: 40, height: 11, marginLeft: -20, borderRadius: 6, background: "#030303", zIndex: 3 }} />
          {/* Camera viewfinder */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#1b1512",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              opacity: p >= 3 ? 0 : 1,
              transition: "opacity 300ms ease-out",
            }}
          >
            <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={corner({ left: 0, top: 0, borderLeft: edge, borderTop: edge, borderTopLeftRadius: 6 })} />
              <span style={corner({ right: 0, top: 0, borderRight: edge, borderTop: edge, borderTopRightRadius: 6 })} />
              <span style={corner({ left: 0, bottom: 0, borderLeft: edge, borderBottom: edge, borderBottomLeftRadius: 6 })} />
              <span style={corner({ right: 0, bottom: 0, borderRight: edge, borderBottom: edge, borderBottomRightRadius: 6 })} />
              <div style={{ width: 58, height: 58, borderRadius: 6, background: "rgba(255,255,255,.9)", padding: 5, opacity: 0.8 }}>
                <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
            </div>
            <p style={{ fontSize: 8.5, fontWeight: 500, color: "rgba(255,255,255,.65)", textAlign: "center", padding: "0 10px" }}>{ui.cameraHint}</p>
          </div>
          {/* Guest upload page */}
          <div style={{ position: "absolute", inset: 0, padding: "30px 12px 12px", opacity: p >= 3 ? 1 : 0, transition: "opacity 350ms ease-out" }}>
            <p style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".22em", color: "#38584d" }}>{ui.guestUpload}</p>
            <p style={{ marginTop: 3, fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: "#172033" }}>Amra &amp; Tarik</p>
            <p style={{ marginTop: 2, fontSize: 8.5, color: "rgba(0,0,0,.45)" }}>{ui.noApp}</p>
            <div
              style={{
                marginTop: 12,
                height: 92,
                borderRadius: 14,
                border: "1.5px dashed rgba(56,88,77,.3)",
                background: "rgba(255,255,255,.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38584d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5" />
                <path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" />
              </svg>
            </div>
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 14, height: 34, borderRadius: 999, background: "#e27952", overflow: "hidden" }}>
              <span style={{ ...btnLayer, opacity: p >= 4 ? 0 : 1, transition: "opacity 250ms ease-out" }}>{ui.addPhotos}</span>
              <span style={{ ...btnLayer, gap: 5, background: "#38584d", opacity: p >= 4 ? 1 : 0, transition: "opacity 300ms ease-out 300ms" }}>
                <Check size={11} width={3} />
                {ui.sent}
              </span>
            </div>
          </div>
        </div>
      </div>

      {FLY_SRC.map((f, i) => {
        const on = p >= 4;
        const d = i * 110;
        return (
          <div
            key={f}
            style={{
              position: "absolute",
              left: 330,
              top: 295,
              width: 60,
              height: 60,
              borderRadius: 12,
              border: "3px solid #fff",
              overflow: "hidden",
              background: "#f2eadf",
              boxShadow: "0 12px 28px rgba(18,24,38,.2)",
              opacity: on ? 1 : 0,
              transform: `translate(${on ? FLY[i][0] : 0}px, ${on ? FLY[i][1] : 0}px) rotate(${on ? FLY[i][2] : 0}deg) scale(${on ? 1 : 0.4})`,
              transition: `opacity 250ms ease-out ${d}ms, transform 650ms ${EASE} ${d}ms`,
            }}
          >
            <img src={IMG + f} alt="" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Scene 3 · Review and curate ────────────────────────────────────
function SceneCurate({ ui, p, enter }: { ui: Ui; p: number; enter: CSSProperties }) {
  const approved = [p >= 2, false, p >= 4, false, false, false];
  const removed = p >= 6;
  const visN = approved.filter(Boolean).length;
  const hidN = 6 - visN - (removed ? 1 : 0);
  const cur = CURSOR[Math.min(p, CURSOR.length - 1)];
  const pill: CSSProperties = { borderRadius: 999, padding: "5px 10px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" };
  return (
    <div style={enter}>
      <div
        style={{
          position: "absolute",
          left: 30,
          top: 22,
          width: 420,
          height: 336,
          borderRadius: 24,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.08)",
          boxShadow: "0 16px 44px rgba(18,24,38,.12)",
        }}
      >
        <div style={{ position: "absolute", left: 20, right: 20, top: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".22em", color: "#38584d" }}>{ui.queue}</p>
            <p style={{ marginTop: 3, fontSize: 14, fontWeight: 600, color: "#172033" }}>Amra &amp; Tarik</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ ...pill, background: "#e6f2ee", color: "#38584d" }}>{`${ui.visible} ${visN}`}</span>
            <span style={{ ...pill, background: "#f2eadf", color: "rgba(0,0,0,.55)" }}>{`${ui.hidden} ${hidN}`}</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 188,
            width: 120,
            height: 108,
            borderRadius: 14,
            border: "1.5px dashed rgba(0,0,0,.14)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            opacity: removed ? 1 : 0,
            transition: "opacity 300ms ease-out 250ms",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,.45)" }}>{ui.deleted}</span>
        </div>
        {TILE_SRC.map((f, i) => {
          const gone = i === 4 && removed;
          const ok = approved[i];
          return (
            <div
              key={f}
              style={{
                position: "absolute",
                ...tilePos(i),
                width: 120,
                height: 108,
                borderRadius: 14,
                overflow: "hidden",
                background: "#f2eadf",
                opacity: gone ? 0 : 1,
                transform: `translateX(${gone ? 50 : 0}px) scale(${gone ? 0.9 : 1})`,
                transition: `opacity 350ms ease-out, transform 450ms ${EASE}`,
              }}
            >
              <img
                src={IMG + f}
                alt=""
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  // The one that gets removed is blurred — the "inappropriate" upload.
                  filter: i === 4 ? "blur(3px)" : "none",
                  transform: `scale(${i === 4 ? 1.15 : 1})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(23,32,51,.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: ok ? 0 : 1,
                  transition: "opacity 450ms ease-out",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.1c.46-.07.93-.1 1.4-.1 5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4" />
                  <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                </svg>
              </div>
              <span
                style={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#38584d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(56,88,77,.4)",
                  transform: `scale(${ok ? 1 : 0})`,
                  transition: `transform 450ms ${SPRING} 150ms`,
                }}
              >
                <Check size={12} width={3.2} />
              </span>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 20, bottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock />
          <span style={{ fontSize: 10.5, color: "rgba(0,0,0,.5)" }}>{ui.hiddenNote}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${cur[0]}px, ${cur[1]}px)`, transition: `transform 450ms ${EASE}` }}>
        <svg width="22" height="24" viewBox="0 0 22 24">
          <path d="M3 2l14 9.5-6.2 1.3 3.6 7-2.6 1.3-3.6-7L3 18z" fill="#172033" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Scene 4 · Deliver the gallery ──────────────────────────────────
function SceneDeliver({ ui, p, burst, enter }: { ui: Ui; p: number; burst: number; enter: CSSProperties }) {
  const open = p >= 2;
  const layer: CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={enter}>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 20,
          width: 360,
          height: 338,
          borderRadius: 24,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.08)",
          boxShadow: "0 16px 44px rgba(18,24,38,.12)",
          padding: 16,
          transform: `scale(${open ? 1 : 0.96})`,
          transition: `transform 500ms ${EASE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <p style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".28em", color: "#38584d" }}>{ui.privateGallery}</p>
            <p style={{ marginTop: 3, fontSize: 16, fontWeight: 600, color: "#172033" }}>Amra &amp; Tarik</p>
            <p style={{ marginTop: 1, fontSize: 10, color: "rgba(0,0,0,.4)" }}>{ui.dateVal}</p>
          </div>
          <span style={{ borderRadius: 999, background: "#e6f2ee", padding: "4px 9px", fontSize: 9.5, fontWeight: 600, color: "#38584d", whiteSpace: "nowrap" }}>
            {ui.pinProtected}
          </span>
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gridTemplateRows: "84px 84px", gap: 4 }}>
          {GAL_SRC.map((f, i) => {
            const d = 80 + i * 70;
            return (
              <div key={f} style={{ gridColumn: i === 0 ? "span 2" : "auto", borderRadius: 10, overflow: "hidden", background: "#f2eadf" }}>
                <img
                  src={IMG + f}
                  alt=""
                  decoding="async"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    opacity: open ? 1 : 0,
                    transform: `scale(${open ? 1 : 1.06})`,
                    transition: `opacity 400ms ease-out ${d}ms, transform 600ms ${EASE} ${d}ms`,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ position: "relative", marginTop: 16, height: 44, borderRadius: 999, background: "#172033", overflow: "hidden" }}>
          <div style={{ ...layer, gap: 9, opacity: p >= 4 ? 0 : 1, transition: "opacity 250ms ease-out" }}>
            <span style={{ position: "relative", width: 18, height: 18 }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                style={{ position: "absolute", inset: 0, opacity: p >= 3 ? 0 : 1, transition: "opacity 200ms ease-out" }}
                fill="none"
                stroke="#fff"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 3.5v9M6 9l4 4 4-4M4 16.5h12" />
              </svg>
              <svg width="18" height="18" viewBox="0 0 20 20" style={{ position: "absolute", inset: 0, opacity: p === 3 ? 1 : 0, transition: "opacity 200ms ease-out" }}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2.2" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="#e27952"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="50.27"
                  strokeDashoffset={p >= 3 ? 0 : 50.27}
                  transform="rotate(-90 10 10)"
                  style={{ transition: `stroke-dashoffset ${p >= 3 ? 1000 : 0}ms linear` }}
                />
              </svg>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{ui.downloadAll}</span>
          </div>
          <div style={{ ...layer, gap: 8, background: "#38584d", opacity: p >= 4 ? 1 : 0, transition: "opacity 300ms ease-out" }}>
            <Check size={15} width={2.8} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{ui.downloaded}</span>
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, borderRadius: 24, background: "rgba(23,32,51,.28)", opacity: open ? 0 : 1, transition: "opacity 400ms ease-out" }} />
      </div>

      {/* Share sheet, dismissed once the link is copied */}
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 130,
          width: 312,
          borderRadius: 22,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.08)",
          boxShadow: "0 24px 60px rgba(18,24,38,.22)",
          padding: 18,
          opacity: open ? 0 : 1,
          transform: `translateY(${open ? 40 : 0}px)`,
          transition: `opacity 350ms ease-out, transform 450ms ${EASE}`,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: "#172033" }}>{ui.shareTitle}</p>
        <p style={{ marginTop: 3, fontSize: 10.5, color: "rgba(0,0,0,.5)" }}>{ui.shareSub}</p>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            borderRadius: 12,
            background: "#f7f2ea",
            border: "1px solid rgba(0,0,0,.06)",
            padding: "0 5px 0 11px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38584d" strokeWidth="2">
            <rect x="5" y="10.5" width="14" height="10" rx="2" />
            <path d="M8 10.5V7.5a4 4 0 018 0v3" />
          </svg>
          <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 11, color: "#172033", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            …/g/amra-tarik
          </span>
          <span style={{ position: "relative", display: "block", height: 30, minWidth: 84, borderRadius: 999, background: "#e27952", overflow: "hidden" }}>
            <span
              style={{
                ...layer,
                fontSize: 10.5,
                fontWeight: 600,
                color: "#fff",
                padding: "0 10px",
                whiteSpace: "nowrap",
                opacity: p >= 1 ? 0 : 1,
                transition: "opacity 200ms ease-out",
              }}
            >
              {ui.copy}
            </span>
            <span
              style={{
                ...layer,
                gap: 4,
                background: "#38584d",
                fontSize: 10.5,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                opacity: p >= 1 ? 1 : 0,
                transition: "opacity 250ms ease-out",
              }}
            >
              <Check size={10} width={3.2} />
              {ui.copied}
            </span>
          </span>
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              borderRadius: 999,
              background: "#e6f2ee",
              padding: "4px 9px",
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".08em",
              color: "#38584d",
            }}
          >
            PIN 4821
          </span>
          <span style={{ fontSize: 10, color: "rgba(0,0,0,.45)" }}>{ui.optional}</span>
        </div>
      </div>

      {burst > 0
        ? CONFETTI.map((q, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: 240 - q.w / 2,
                top: 318 - q.h / 2,
                width: q.w,
                height: q.h,
                borderRadius: q.br,
                background: q.c,
                opacity: burst === 3 ? 0 : 1,
                transform:
                  burst >= 2
                    ? `translate(${burst === 3 ? q.dx * 1.1 : q.dx}px, ${burst === 3 ? q.dy + 90 : q.dy}px) rotate(${burst === 3 ? q.rot * 1.4 : q.rot}deg) scale(1)`
                    : "translate(0px, 0px) rotate(0deg) scale(0.2)",
                transition:
                  burst === 2
                    ? `transform 650ms cubic-bezier(.16,1,.3,1) ${q.d}ms, opacity 150ms ease-out ${q.d}ms`
                    : burst === 3
                      ? "transform 1100ms cubic-bezier(.5,0,.75,0), opacity 800ms ease-in 250ms"
                      : "none",
              }}
            />
          ))
        : null}
    </div>
  );
}
