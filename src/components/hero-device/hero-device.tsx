"use client";

/* eslint-disable @next/next/no-img-element -- every image here sits inside a
   perspective-warped mock screen at fixed design pixels; next/image's sizing
   wrapper would fight the transform. */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
} from "react";

import type { Dict } from "@/lib/i18n/index";

/**
 * The landing hero's right column: a hand holding a tilted iPhone whose screen
 * is live HTML inside the same 3D object, playing a 12-second
 * story — a guest scans the QR, sends three photos, the host gets a
 * notification, approves two of them out of the "hidden until you approve"
 * sheet, and the private gallery scrolls with the new photos in it.
 *
 * Ported from the Claude Design handoff "Hero Device.dc.html". The story is a
 * list of cue times (`CUES`); `t` is the current cue and every style below is
 * a pure function of it, so CSS transitions do the animating and reduced
 * motion simply shows the frame at `STILL_T`. The loop only runs while the
 * device is on screen, the tab is visible and its first images are decoded.
 *
 * Guest photos never appear in the gallery on their own — they arrive hidden
 * and only the approved ones move in, which is how the product works.
 */

type Copy = Dict["landing"]["heroDevice"];

const GP = "/gallery-preview/";
const GUEST = ["/explainer/assets/phone-cake.webp", "/explainer/assets/phone-nana.webp", GP + "p7.jpg"];
const CAMERA_BG = GP + "p5.jpg";

const CUES = [
  0, 300, 1200, 1450, 2050, 2150, 2250, 2400, 2950, 3000, 3200, 3400, 3600, 4000, 5000, 5250, 5900, 6250, 6700, 6800,
  6850, 7050, 7500, 8000, 8300, 9300, 10300, 11300,
];
const LOOP = 12000;
/** The frame shown under reduced motion: the gallery with the notification on it. */
const STILL_T = 4000;

const E = "cubic-bezier(.22,1,.36,1)";
const IO = "cubic-bezier(.45,0,.55,1)";
const SPR = "cubic-bezier(.34,1.45,.64,1)";
const N = "none";
const SERIF = "var(--font-display)";
const MONO = "var(--font-jetbrains), ui-monospace, monospace";

// ─── The phone, drawn in code ─────────────────────────────────────
// A photo of a phone with HTML pasted onto its screen never lines up with
// the glass; here the frame, bezel and screen are one 3D object.
const DEV = { w: 441, h: 900 } as const;
const SCREEN = { w: 393, h: 852 } as const;

/** Continuous ("squircle") rounded rectangle as an SVG path, like Apple's corners. */
function squircle(w: number, h: number, r: number, o = 0) {
  const a = Math.min(r * 1.32, w / 2, h / 2);
  const c = a * 0.24;
  const x0 = o;
  const y0 = o;
  const x1 = o + w;
  const y1 = o + h;
  const n = (v: number) => +v.toFixed(2);
  return (
    `M${n(x0 + a)} ${n(y0)}H${n(x1 - a)}C${n(x1 - c)} ${n(y0)} ${n(x1)} ${n(y0 + c)} ${n(x1)} ${n(y0 + a)}` +
    `V${n(y1 - a)}C${n(x1)} ${n(y1 - c)} ${n(x1 - c)} ${n(y1)} ${n(x1 - a)} ${n(y1)}` +
    `H${n(x0 + a)}C${n(x0 + c)} ${n(y1)} ${n(x0)} ${n(y1 - c)} ${n(x0)} ${n(y1 - a)}` +
    `V${n(y0 + a)}C${n(x0)} ${n(y0 + c)} ${n(x0 + c)} ${n(y0)} ${n(x0 + a)} ${n(y0)}Z`
  );
}
const OUTER = squircle(DEV.w, DEV.h, 70);
const BEZEL = squircle(429, 888, 64, 6);
const OUTER_CLIP = `path('${OUTER}')`;
const BEZEL_CLIP = `path('${squircle(429, 888, 64)}')`;
const SCREEN_CLIP = `path('${squircle(SCREEN.w, SCREEN.h, 55)}')`;
/** Slices behind the front face give the frame its thickness when it turns. */
const DEPTH = Array.from({ length: 8 }, (_, i) => ({
  z: -(i + 1) * 1.25,
  bg: i === 7 ? "#3b3630" : "linear-gradient(90deg, #5d564c, #a1988a 30%, #7b7366 70%, #4d473f)",
}));
const SIDE_BUTTONS: CSSProperties[] = [
  { left: -4, top: 176, height: 54 },
  { left: -4, top: 262, height: 90 },
  { left: -4, top: 372, height: 90 },
  { right: -4, top: 300, height: 140 },
];
/** How the phone rests: turned a little away, tipped toward the viewer. */
const REST_POSE = "rotateY(-18deg) rotateX(6deg) rotateZ(2deg)";

const COLS = [
  [
    { src: GUEST[0], h: 150, fresh: true },
    { src: GP + "p1.jpg", h: 220 },
    { src: GP + "p3.jpg", h: 176 },
    { src: GP + "p5.jpg", h: 236 },
    { src: GP + "p8.jpg", h: 200 },
  ],
  [
    { src: GUEST[1], h: 150, fresh: true },
    { src: GP + "p2.jpg", h: 168 },
    { src: GP + "p4.jpg", h: 230 },
    { src: GP + "p6.jpg", h: 190 },
    { src: GP + "p1.jpg", h: 214 },
  ],
];

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type Rect = { x: number; w: number };

const StatusIcons = ({ battery }: { battery: string }) => (
  <div style={{ position: "absolute", right: 34, top: 21, display: "flex", alignItems: "center", gap: 6 }}>
    <svg width="18" height="12" viewBox="0 0 18 12">
      <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
      <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
    <svg width="16" height="12" viewBox="0 0 14 11" fill="none">
      <circle cx="7" cy="9.5" r="1.3" fill="currentColor" />
      <path d="M4.2 6.8a4 4 0 015.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M1.4 4a8 8 0 0111.2 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
    <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
      <div style={{ position: "relative", width: 25, height: 12, borderRadius: 4, border: `1px solid ${battery}` }}>
        <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, right: 5, borderRadius: 2, background: "currentColor" }} />
      </div>
      <div style={{ width: 2, height: 5, borderRadius: "0 2px 2px 0", background: battery }} />
    </div>
  </div>
);

const Brackets = ({ color }: { color: string }) => {
  const side = `4px solid ${color}`;
  const box: CSSProperties = { position: "absolute", width: 38, height: 38 };
  return (
    <>
      <div style={{ ...box, left: 0, top: 0, borderLeft: side, borderTop: side, borderTopLeftRadius: 14 }} />
      <div style={{ ...box, right: 0, top: 0, borderRight: side, borderTop: side, borderTopRightRadius: 14 }} />
      <div style={{ ...box, left: 0, bottom: 0, borderLeft: side, borderBottom: side, borderBottomLeftRadius: 14 }} />
      <div style={{ ...box, right: 0, bottom: 0, borderRight: side, borderBottom: side, borderBottomRightRadius: 14 }} />
    </>
  );
};

const LockIcon = ({ size, width }: { size: number; width: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);

export function HeroDevice({ copy, qrSvg }: { copy: Copy; qrSvg: string }) {
  const c = copy.screen;
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );

  const [cue, setCue] = useState(0);
  const [s, setS] = useState(560 / DEV.h);
  const [tabRects, setTabRects] = useState<Rect[] | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const bracketsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLDivElement>(null);
  const tabEls = useRef<(HTMLSpanElement | null)[]>([]);

  const cueIdx = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const ready = useRef(false);
  const inView = useRef(false);
  const visible = useRef(true);
  const reducedRef = useRef(false);
  const scheduleRef = useRef<() => void>(() => {});

  // One-shot presses and pulses, fired when their cue arrives.
  const onCue = useCallback((t: number) => {
    const opts = { easing: E };
    if (t === 1200) {
      ringRef.current?.animate([{ opacity: 0.9, transform: "scale(.7)" }, { opacity: 0, transform: "scale(1.6)" }], { ...opts, duration: 700 });
      bracketsRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(.965)" }, { transform: "scale(1)" }], { ...opts, duration: 320 });
    }
    if (t === 2400) {
      sendRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { ...opts, duration: 260 });
    }
    if (t === 5000) {
      notifRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(.965)" }, { transform: "scale(1)" }], { ...opts, duration: 300 });
      touchRef.current?.animate([{ opacity: 1, transform: "scale(.5)" }, { opacity: 0, transform: "scale(1.5)" }], { ...opts, duration: 500 });
    }
  }, []);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    if (reducedRef.current || !ready.current || !inView.current || !visible.current) return;
    const next = CUES[cueIdx.current + 1] ?? LOOP;
    timer.current = window.setTimeout(() => {
      cueIdx.current = cueIdx.current + 1 >= CUES.length ? 0 : cueIdx.current + 1;
      const t = CUES[cueIdx.current];
      setCue(t);
      requestAnimationFrame(() => onCue(t));
      scheduleRef.current();
    }, next - CUES[cueIdx.current]);
  }, [onCue]);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  useEffect(() => {
    reducedRef.current = reduced;
    scheduleRef.current();
  }, [reduced]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const ro = new ResizeObserver(([e]) => setS(e.contentRect.height / DEV.h));
    ro.observe(stage);

    const io = new IntersectionObserver(
      ([e]) => {
        inView.current = e.isIntersecting;
        scheduleRef.current();
      },
      { threshold: 0.15 },
    );
    io.observe(stage);

    const onVis = () => {
      visible.current = !document.hidden;
      scheduleRef.current();
    };
    document.addEventListener("visibilitychange", onVis);

    // The story starts only once its first frames are decoded, so the camera
    // scene never plays over a blank screen.
    let alive = true;
    Promise.all(
      [CAMERA_BG, ...GUEST].map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().catch(() => {});
      }),
    ).then(() => {
      if (!alive) return;
      ready.current = true;
      scheduleRef.current();
    });

    // The sliding tab pill needs the real label widths, which depend on the font.
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      if (!alive) return;
      const r = tabEls.current.map((el) => (el ? { x: el.offsetLeft, w: el.offsetWidth } : null));
      if (r.length === 4 && r.every(Boolean)) setTabRects(r as Rect[]);
    });

    return () => {
      alive = false;
      clearTimeout(timer.current);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || reducedRef.current || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(nx * 12).toFixed(2)}deg) rotateX(${(-ny * 8).toFixed(2)}deg)`;
  };
  const onPointerLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };

  // ─── Every style, derived from the current cue ─────────────────────
  const t = reduced ? STILL_T : cue;
  const inR = (a: number, b: number) => t >= a && t < b;

  const locked = inR(300, 3000);
  const green = inR(1200, 3000);
  const chip = inR(1200, 3000);
  const upOn = inR(1450, 3000);
  const galOn = inR(3000, 11300);
  const nOn = inR(3400, 5250);
  const sOn = inR(5250, 7500);
  const cn = t >= 7050 ? 2 : t >= 6850 ? 1 : 0;
  const tab = t >= 10300 ? 3 : t >= 9300 ? 2 : t >= 8300 ? 1 : 0;
  const dark = t < 1450 || t >= 11300;
  const approvedAll = t >= 6800;
  const freshRing = inR(6800, 8300) ? 1 : 0;
  const base = tabRects ? tabRects[0].w : 0;

  const pops = [2050, 2150, 2250];
  const k = 44 / 107;
  const fly = GUEST.map((src, i) => {
    let x = 24 + 119 * i;
    let y = 460;
    let sc = 1;
    let op = 1;
    let tr = N;
    if (t < pops[i]) {
      sc = 0.6;
      op = 0;
      x += 21;
      y += 21;
    } else if (t < 3200) {
      if (t < 3000) tr = `transform 480ms ${SPR}, opacity 200ms ease`;
    } else {
      x = 74 + 52 * i;
      y = 120;
      sc = k;
      if (t < 4000) tr = `transform 760ms ${E} ${i * 50}ms`;
      else op = 0;
    }
    return { src, tf: `translate(${x}px, ${y}px) scale(${sc})`, op, tr };
  });

  const checks = [5900, 6250];
  const sheetPhotos = GUEST.map((src, i) => {
    const approvable = i < 2;
    const chk = approvable && t >= checks[i];
    const gone = approvable && t >= 6700;
    return {
      src,
      chkOp: chk ? 1 : 0,
      hidOp: chk ? 0 : 1,
      chkTf: chk ? "scale(1)" : "scale(.4)",
      chkTr: approvable && inR(checks[i], 7500) ? `transform 420ms ${SPR}, opacity 200ms ease` : N,
      tf: gone ? "translateY(-150px) scale(.8)" : "none",
      op: gone ? 0 : 1,
      tr: approvable && inR(6700, 7500) ? `transform 560ms ${E} ${i * 80}ms, opacity 420ms ease ${i * 80}ms` : N,
    };
  });

  const abs: CSSProperties = { position: "absolute" };
  const fill: CSSProperties = { position: "absolute", inset: 0 };
  const cover: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
  const label: CSSProperties = { position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" };

  return (
    <div
      aria-hidden="true"
      data-hero-device=""
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="lg:self-start"
      style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", perspective: 1600 }}
    >
      <div
        ref={stageRef}
        style={{
          position: "relative",
          // Capped by the viewport height too (nav, hero padding, margins), so
          // the whole phone is visible on a 1366×610 laptop screen.
          height: "min(560px, calc(100svh - 190px), calc(75vw * 900 / 441))",
          aspectRatio: "441 / 900",
          margin: "16px 0 40px",
        }}
      >
        <div
          style={{
            ...abs,
            left: "-40%",
            right: "-40%",
            top: "6%",
            bottom: "10%",
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(226,121,82,.24), rgba(226,121,82,.07) 55%, transparent)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            ...abs,
            left: "6%",
            right: "2%",
            bottom: "-7%",
            height: "9%",
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(110,66,38,.30), rgba(110,66,38,.10) 55%, transparent)",
            filter: "blur(10px)",
            pointerEvents: "none",
          }}
        />

        <div className="hd-enter" style={{ ...fill, transformStyle: "preserve-3d" }}>
          <div ref={tiltRef} style={{ ...fill, transformStyle: "preserve-3d", transition: `transform 800ms ${E}` }}>
            <div className="hd-drift" style={{ ...fill, transformStyle: "preserve-3d" }}>
              <div style={{ ...fill, transformStyle: "preserve-3d", transform: REST_POSE }}>
                <div style={{ ...abs, left: 0, top: 0, width: DEV.w, height: DEV.h, transformOrigin: "0 0", transform: `scale(${s})`, transformStyle: "preserve-3d" }}>
                  {DEPTH.map((layer) => (
                    <div key={layer.z} style={{ ...fill, clipPath: OUTER_CLIP, background: layer.bg, transform: `translateZ(${layer.z}px)` }} />
                  ))}
                  {SIDE_BUTTONS.map((b, i) => (
                    <div
                      key={i}
                      style={{
                        ...abs,
                        ...b,
                        width: 8,
                        borderRadius: 4,
                        background:
                          "right" in b
                            ? "linear-gradient(90deg,#8a8274,#d6cebf 55%,#6c6559)"
                            : "linear-gradient(90deg,#6c6559,#c9c0b1 45%,#8a8274)",
                        transform: "translateZ(-5px)",
                      }}
                    />
                  ))}
                  <svg
                    width={DEV.w}
                    height={DEV.h}
                    viewBox={`0 0 ${DEV.w} ${DEV.h}`}
                    style={{ ...abs, left: 0, top: 0, overflow: "visible", transform: "translateZ(0px)" }}
                  >
                    <defs>
                      <linearGradient id="cfTi" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#f1ebe1" />
                        <stop offset=".16" stopColor="#c3baab" />
                        <stop offset=".46" stopColor="#9b9282" />
                        <stop offset=".72" stopColor="#b9b0a1" />
                        <stop offset=".9" stopColor="#8a8173" />
                        <stop offset="1" stopColor="#6f675b" />
                      </linearGradient>
                      <linearGradient id="cfRim" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="rgba(255,255,255,.95)" />
                        <stop offset=".35" stopColor="rgba(255,255,255,.25)" />
                        <stop offset=".7" stopColor="rgba(255,255,255,.08)" />
                        <stop offset="1" stopColor="rgba(255,255,255,.35)" />
                      </linearGradient>
                    </defs>
                    <path d={OUTER} fill="url(#cfTi)" />
                    <path d={OUTER} fill="none" stroke="url(#cfRim)" strokeWidth="1.4" />
                    <path d={BEZEL} fill="none" stroke="rgba(40,34,28,.55)" strokeWidth="1" />
                    <path d={BEZEL} fill="#0a0a0b" />
                    <path d={BEZEL} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
                  </svg>

                {/* ─── The live screen ─── */}
                <div
                  style={{
                    ...abs,
                    left: 24,
                    top: 24,
                    width: SCREEN.w,
                    height: SCREEN.h,
                    borderRadius: 55,
                    clipPath: SCREEN_CLIP,
                    overflow: "hidden",
                    background: "#0b0b0d",
                    isolation: "isolate",
                    transform: "translateZ(0.6px)",
                  }}
                >
                  {/* 1 · Camera scanning the QR on a table card */}
                  <div style={{ ...fill, background: "#0b0b0d" }}>
                    <img
                      src={CAMERA_BG}
                      alt=""
                      style={{ ...abs, left: -24, top: -24, width: 441, height: 900, objectFit: "cover", filter: "blur(7px) brightness(.5) saturate(1.1)" }}
                    />
                    <div
                      style={{
                        ...abs,
                        left: 96,
                        top: 292,
                        width: 200,
                        height: 254,
                        borderRadius: 18,
                        background: "#fbf8f3",
                        boxShadow: "0 30px 60px rgba(0,0,0,.45)",
                        transform: "rotate(-3deg)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        paddingTop: 18,
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".18em", color: "#38584d" }}>{c.eventNameCaps}</span>
                      <div
                        className="[&>svg]:h-full [&>svg]:w-full"
                        style={{ marginTop: 12, width: 138, height: 138 }}
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                      <span style={{ marginTop: 12, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(0,0,0,.45)" }}>
                        {copy.cards.qrLabel}
                      </span>
                    </div>
                    <div ref={bracketsRef} style={{ ...abs, left: 78, top: 282, width: 237, height: 274 }}>
                      <div
                        style={{
                          ...fill,
                          transform: locked ? "scale(1)" : "scale(1.14)",
                          opacity: locked ? 1 : 0.7,
                          transition: inR(300, 1450) ? `transform 600ms ${E}, opacity 400ms ease` : N,
                        }}
                      >
                        <div style={{ ...fill, opacity: green ? 0 : 1, transition: inR(1200, 1450) ? "opacity 250ms ease" : N }}>
                          <Brackets color="#fff" />
                        </div>
                        <div style={{ ...fill, opacity: green ? 1 : 0, transition: inR(1200, 1450) ? "opacity 250ms ease" : N }}>
                          <Brackets color="#8fd6b3" />
                        </div>
                      </div>
                      <div
                        style={{
                          ...abs,
                          left: 12,
                          right: 12,
                          top: 0,
                          height: 2,
                          borderRadius: 2,
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)",
                          boxShadow: "0 0 14px 2px rgba(255,255,255,.35)",
                          transform: inR(300, 3000) ? "translateY(272px)" : "translateY(0)",
                          opacity: inR(300, 1200) ? 1 : 0,
                          transition: inR(300, 1450) ? `transform 900ms ${IO}, opacity 200ms ease` : N,
                        }}
                      />
                      <div
                        ref={ringRef}
                        style={{
                          ...abs,
                          left: "50%",
                          top: "50%",
                          width: 240,
                          height: 240,
                          margin: "-120px 0 0 -120px",
                          borderRadius: "50%",
                          border: "2px solid rgba(143,214,179,.9)",
                          opacity: 0,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        ...abs,
                        left: 24,
                        right: 24,
                        top: 592,
                        display: "flex",
                        justifyContent: "center",
                        transform: chip ? "translateY(0)" : "translateY(10px)",
                        opacity: chip ? 1 : 0,
                        transition: inR(1200, 1450) ? `transform 420ms ${E}, opacity 300ms ease` : N,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: 999,
                          background: "rgba(255,255,255,.9)",
                          padding: "8px 16px 8px 8px",
                          boxShadow: "0 10px 30px rgba(0,0,0,.3)",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            width: 28,
                            height: 28,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            background: "#e27952",
                            color: "#fff",
                            fontFamily: SERIF,
                            fontSize: 15,
                            fontWeight: 600,
                          }}
                        >
                          C
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#172033", whiteSpace: "nowrap" }}>{c.camChip}</span>
                      </div>
                    </div>
                    <div style={{ ...abs, left: 0, right: 0, bottom: 122, textAlign: "center", fontSize: 13, fontWeight: 600, letterSpacing: ".12em", color: "#ffd60a" }}>
                      {c.cameraMode}
                    </div>
                    <div
                      style={{
                        ...abs,
                        left: "50%",
                        bottom: 34,
                        width: 76,
                        height: 76,
                        marginLeft: -38,
                        borderRadius: "50%",
                        border: "4px solid #fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff" }} />
                    </div>
                  </div>

                  {/* 2 · Guest upload page */}
                  <div
                    style={{
                      ...fill,
                      background: "#fbf8f3",
                      transform: upOn ? "translateY(0)" : inR(3000, 3600) ? "scale(.94)" : "translateY(100%)",
                      opacity: t >= 3000 ? 0 : 1,
                      transition: inR(1450, 2600) ? `transform 560ms ${E}` : inR(3000, 3600) ? `transform 500ms ${E}, opacity 400ms ease` : N,
                    }}
                  >
                    <div style={{ ...abs, left: 24, right: 24, top: 74 }}>
                      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#38584d" }}>{c.eventMeta}</p>
                      <p style={{ marginTop: 8, fontFamily: SERIF, fontSize: 40, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em", color: "#172033" }}>
                        {c.eventName}
                      </p>
                      <span
                        style={{
                          display: "inline-flex",
                          marginTop: 14,
                          borderRadius: 999,
                          background: "#e6f2ee",
                          padding: "6px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#38584d",
                        }}
                      >
                        {c.noApp}
                      </span>
                    </div>
                    <div
                      style={{
                        ...abs,
                        left: 24,
                        right: 24,
                        top: 236,
                        height: 204,
                        borderRadius: 26,
                        border: "1.5px dashed rgba(56,88,77,.35)",
                        background: "#fff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "0 20px",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          width: 56,
                          height: 56,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 18,
                          background: "rgba(226,121,82,.12)",
                          color: "#e27952",
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
                          <path d="M8.5 6.5l1.4-2.2h4.2l1.4 2.2" />
                          <circle cx="12" cy="13" r="3.4" />
                        </svg>
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: "#172033" }}>{c.addPhotos}</span>
                      <span style={{ fontSize: 14, color: "rgba(0,0,0,.5)" }}>{c.addPhotosSub}</span>
                    </div>
                    <div style={{ ...abs, left: 24, top: 460, display: "flex", gap: 12 }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: 107, height: 107, borderRadius: 20, background: "#f2eadf" }} />
                      ))}
                    </div>
                    <div
                      style={{
                        ...abs,
                        left: 24,
                        right: 24,
                        top: 596,
                        opacity: inR(2250, 3600) ? 1 : 0,
                        transition: inR(2250, 3000) ? "opacity 250ms ease" : N,
                      }}
                    >
                      <div style={{ position: "relative", height: 22 }}>
                        {[
                          { text: c.selected, on: inR(2250, 2400), color: "#172033" },
                          { text: c.sending, on: inR(2400, 2950), color: "#172033" },
                          { text: c.sent, on: inR(2950, 3600), color: "#38584d" },
                        ].map((l) => (
                          <span
                            key={l.text}
                            style={{
                              ...label,
                              fontSize: 15,
                              fontWeight: 600,
                              color: l.color,
                              opacity: l.on ? 1 : 0,
                              transition: inR(2250, 3000) ? "opacity 220ms ease" : N,
                            }}
                          >
                            {l.text}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "#f2eadf", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 999,
                            background: "#38584d",
                            transformOrigin: "0 50%",
                            transform: inR(2400, 3600) ? "scaleX(1)" : "scaleX(0)",
                            transition: inR(2400, 3000) ? "transform 540ms cubic-bezier(.4,0,.2,1)" : N,
                          }}
                        />
                      </div>
                    </div>
                    <div
                      ref={sendRef}
                      style={{
                        ...abs,
                        left: 24,
                        right: 24,
                        top: 676,
                        height: 58,
                        borderRadius: 20,
                        background: "#e27952",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        fontWeight: 600,
                        boxShadow: "0 12px 32px rgba(226,121,82,.30)",
                      }}
                    >
                      {c.send}
                    </div>
                  </div>

                  {/* 3 · Host: private gallery, notification and approval sheet */}
                  <div
                    style={{
                      ...fill,
                      background: "#f9f5ef",
                      transform: galOn ? "scale(1)" : "scale(1.03)",
                      opacity: galOn ? 1 : 0,
                      transition: inR(3000, 3600)
                        ? `opacity 500ms ease, transform 700ms ${E}`
                        : t >= 11300
                          ? `opacity 600ms ease, transform 600ms ${E}`
                          : N,
                    }}
                  >
                    <div
                      style={{
                        ...abs,
                        left: 16,
                        right: 16,
                        top: 62,
                        borderRadius: 26,
                        background: "#fff",
                        boxShadow: "0 6px 28px rgba(18,24,38,.09)",
                        padding: "18px 20px 16px",
                      }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".28em", textTransform: "uppercase", color: "#38584d" }}>{c.galleryEyebrow}</p>
                      <p
                        style={{
                          marginTop: 6,
                          fontFamily: SERIF,
                          fontSize: 24,
                          lineHeight: 1.15,
                          fontWeight: 600,
                          color: "#172033",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.galleryName}
                      </p>
                      <p style={{ marginTop: 4, fontSize: 13, lineHeight: "18px", color: "rgba(0,0,0,.45)", display: "flex", gap: 4, alignItems: "center" }}>
                        <span>{c.date} ·</span>
                        <span style={{ display: "inline-block", height: 18, overflow: "hidden", fontVariantNumeric: "tabular-nums" }}>
                          <span
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              transform: `translateY(${-18 * cn}px)`,
                              transition: inR(6850, 7700) ? `transform 380ms ${E}` : N,
                            }}
                          >
                            <span style={{ height: 18 }}>244</span>
                            <span style={{ height: 18 }}>245</span>
                            <span style={{ height: 18 }}>246</span>
                          </span>
                        </span>
                        <span>{c.photosWord}</span>
                      </p>
                      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                        <span style={{ borderRadius: 999, background: "#f2eadf", padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,.55)" }}>
                          {c.guests}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            borderRadius: 999,
                            background: "#e6f2ee",
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#38584d",
                          }}
                        >
                          <LockIcon size={12} width={2.2} />
                          {c.pin}
                        </span>
                      </div>
                    </div>

                    {/* Section tabs with a sliding pill */}
                    <div style={{ ...abs, left: 16, right: 0, top: 208, height: 34 }}>
                      <div style={{ ...abs, left: 0, top: 0, display: "flex", gap: 8 }}>
                        {c.tabs.map((tabLabel) => (
                          <span
                            key={tabLabel}
                            style={{
                              height: 34,
                              display: "flex",
                              alignItems: "center",
                              padding: "0 14px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,.75)",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "transparent",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tabLabel}
                          </span>
                        ))}
                      </div>
                      <div
                        style={{
                          ...abs,
                          left: 0,
                          top: 0,
                          height: 34,
                          width: base,
                          borderRadius: 999,
                          background: "#172033",
                          transformOrigin: "0 50%",
                          transform: tabRects ? `translateX(${tabRects[tab].x}px) scaleX(${(tabRects[tab].w / base).toFixed(4)})` : "none",
                          transition: inR(8300, 11300) ? `transform 520ms ${E}` : N,
                          opacity: tabRects ? 1 : 0,
                        }}
                      />
                      <div style={{ ...abs, left: 0, top: 0, display: "flex", gap: 8 }}>
                        {c.tabs.map((tabLabel, i) => (
                          <span
                            key={tabLabel}
                            ref={(el) => {
                              tabEls.current[i] = el;
                            }}
                            style={{
                              height: 34,
                              display: "flex",
                              alignItems: "center",
                              padding: "0 14px",
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              color: i === tab ? "#fff" : "rgba(0,0,0,.42)",
                              background: !tabRects && i === tab ? "#172033" : "transparent",
                              transition: inR(8300, 11300) ? "color 260ms ease" : N,
                            }}
                          >
                            {tabLabel}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Masonry, scrolling */}
                    <div style={{ ...abs, left: 16, right: 16, top: 256, bottom: 0, overflow: "hidden" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          transform: t >= 8000 ? "translateY(-250px)" : "translateY(0)",
                          transition: inR(8000, 11300) ? `transform 3200ms ${IO}` : N,
                        }}
                      >
                        {COLS.map((col, ci) => (
                          <div
                            key={ci}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              // The approved photos push the column down as they arrive.
                              transform: approvedAll ? "translateY(0)" : "translateY(-158px)",
                              transition: inR(6800, 7700) ? `transform 700ms ${E} ${ci * 90}ms` : N,
                            }}
                          >
                            {col.map((it, ii) => (
                              <div key={ii} style={{ position: "relative", height: it.h, borderRadius: 16, overflow: "hidden", background: "#f2eadf" }}>
                                <img src={it.src} alt="" decoding="async" style={cover} />
                                <div
                                  style={{
                                    ...fill,
                                    borderRadius: 16,
                                    boxShadow: "inset 0 0 0 3px #38584d",
                                    opacity: "fresh" in it ? freshRing : 0,
                                    transition: inR(6800, 9000) ? "opacity 500ms ease" : N,
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ ...fill, background: "#172033", opacity: sOn ? 0.16 : 0, transition: inR(5250, 8300) ? "opacity 400ms ease" : N, pointerEvents: "none" }} />

                    {/* "Hidden until you approve" sheet */}
                    <div
                      style={{
                        ...abs,
                        left: 0,
                        right: 0,
                        top: 404,
                        height: 520,
                        borderRadius: "34px 34px 0 0",
                        background: "#fff",
                        boxShadow: "0 -12px 40px rgba(18,24,38,.14)",
                        transform: sOn ? "translateY(0)" : "translateY(105%)",
                        transition: sOn ? `transform 600ms ${E}` : inR(7500, 8300) ? "transform 480ms cubic-bezier(.4,0,.2,1)" : N,
                      }}
                    >
                      <div style={{ width: 40, height: 5, borderRadius: 3, background: "rgba(0,0,0,.14)", margin: "10px auto 0" }} />
                      <div style={{ padding: "14px 24px 0" }}>
                        <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#e27952" }}>{c.sheetEyebrow}</p>
                        <p style={{ marginTop: 6, fontFamily: SERIF, fontSize: 23, lineHeight: 1.2, fontWeight: 600, color: "#172033", textWrap: "balance" }}>
                          {c.sheetTitle}
                        </p>
                      </div>
                      <div style={{ ...abs, left: 24, top: 150, display: "flex", gap: 12 }}>
                        {sheetPhotos.map((sp) => (
                          <div
                            key={sp.src}
                            style={{ width: 107, display: "flex", flexDirection: "column", gap: 8, transform: sp.tf, opacity: sp.op, transition: sp.tr }}
                          >
                            <div style={{ position: "relative", width: 107, height: 107, borderRadius: 20, overflow: "hidden" }}>
                              <img src={sp.src} alt="" decoding="async" style={cover} />
                              <div
                                style={{
                                  ...abs,
                                  right: 7,
                                  top: 7,
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "#38584d",
                                  border: "2px solid #fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transform: sp.chkTf,
                                  opacity: sp.chkOp,
                                  transition: sp.chkTr,
                                }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                                </svg>
                              </div>
                            </div>
                            <div style={{ position: "relative", height: 18 }}>
                              <span
                                style={{
                                  ...label,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "rgba(0,0,0,.45)",
                                  opacity: sp.hidOp,
                                  transition: sp.chkTr,
                                }}
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 3l18 18" />
                                  <path d="M10.6 5.1A10 10 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.4 8 2.7 10.2 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.3-1.1" />
                                </svg>
                                {c.hidden}
                              </span>
                              <span style={{ ...label, fontSize: 12, fontWeight: 600, color: "#38584d", opacity: sp.chkOp, transition: sp.chkTr }}>{c.approved}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push notification */}
                    <div
                      style={{
                        ...abs,
                        left: 10,
                        right: 10,
                        top: 58,
                        transform: nOn ? "translateY(0)" : "translateY(-150%)",
                        opacity: nOn ? 1 : 0,
                        transition: nOn
                          ? `transform 650ms ${E}, opacity 300ms ease`
                          : inR(5250, 6000)
                            ? "transform 420ms cubic-bezier(.4,0,1,1), opacity 350ms ease"
                            : N,
                      }}
                    >
                      <div
                        ref={notifRef}
                        style={{
                          position: "relative",
                          borderRadius: 26,
                          border: "1px solid rgba(255,255,255,.7)",
                          background: "rgba(255,255,255,.84)",
                          backdropFilter: "blur(24px)",
                          WebkitBackdropFilter: "blur(24px)",
                          boxShadow: "0 14px 40px rgba(18,24,38,.2)",
                          padding: 14,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, height: 38 }}>
                          <span
                            style={{
                              display: "flex",
                              width: 38,
                              height: 38,
                              flexShrink: 0,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 10,
                              background: "#e27952",
                              color: "#fff",
                              fontFamily: SERIF,
                              fontSize: 19,
                              fontWeight: 600,
                              boxShadow: "inset 0 -1px 0 rgba(0,0,0,.12)",
                            }}
                          >
                            C
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(0,0,0,.55)" }}>Confetti</span>
                              <span style={{ fontSize: 12, color: "rgba(0,0,0,.4)" }}>{c.notifTime}</span>
                            </div>
                            <p
                              style={{
                                marginTop: 1,
                                fontSize: 15,
                                lineHeight: "19px",
                                fontWeight: 500,
                                color: "#172033",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {c.notifText}
                            </p>
                          </div>
                        </div>
                        <div style={{ marginTop: 10, paddingLeft: 50, display: "flex", gap: 8, opacity: t >= 4000 ? 1 : 0 }}>
                          {GUEST.map((g) => (
                            <img
                              key={g}
                              src={g}
                              alt=""
                              style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", display: "block", boxShadow: "0 0 0 1px rgba(0,0,0,.05)" }}
                            />
                          ))}
                        </div>
                        <div
                          ref={touchRef}
                          style={{ ...abs, left: "50%", top: "50%", width: 64, height: 64, margin: "-32px 0 0 -32px", borderRadius: "50%", background: "rgba(23,32,51,.14)", opacity: 0 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* The three sent photos travel from the guest's screen into the notification */}
                  {fly.map((f) => (
                    <div
                      key={f.src}
                      style={{
                        ...abs,
                        left: 0,
                        top: 0,
                        width: 107,
                        height: 107,
                        borderRadius: 20,
                        overflow: "hidden",
                        transformOrigin: "0 0",
                        boxShadow: "0 10px 24px rgba(18,24,38,.18)",
                        transform: f.tf,
                        opacity: f.op,
                        transition: f.tr,
                      }}
                    >
                      <img src={f.src} alt="" style={cover} />
                    </div>
                  ))}

                  {/* Status bar: light over the camera, dark over the app */}
                  <div style={{ ...abs, left: 0, right: 0, top: 0, height: 54, opacity: dark ? 1 : 0, transition: "opacity 300ms", color: "#fff" }}>
                    <span style={{ ...abs, left: 44, top: 18, fontSize: 17, fontWeight: 600 }}>9:41</span>
                    <StatusIcons battery="rgba(255,255,255,.6)" />
                  </div>
                  <div style={{ ...abs, left: 0, right: 0, top: 0, height: 54, opacity: dark ? 0 : 1, transition: "opacity 300ms", color: "#172033" }}>
                    <span style={{ ...abs, left: 44, top: 18, fontSize: 17, fontWeight: 600 }}>9:41</span>
                    <StatusIcons battery="rgba(23,32,51,.5)" />
                  </div>
                  <div
                    style={{
                      ...abs,
                      left: 129,
                      bottom: 9,
                      width: 135,
                      height: 5,
                      borderRadius: 3,
                      background: dark ? "rgba(255,255,255,.7)" : "rgba(23,32,51,.35)",
                      transition: "background 300ms",
                    }}
                  />
                  {/* Dynamic Island */}
                  <div style={{ ...abs, left: 133, top: 11, width: 127, height: 37, borderRadius: 20, background: "#000", boxShadow: "0 0 0 1px rgba(255,255,255,.04)" }}>
                    <div
                      style={{
                        ...abs,
                        right: 12,
                        top: 11,
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #1d2433, #050608 60%)",
                      }}
                    />
                  </div>
                  {/* Glass */}
                  <div
                    style={{
                      ...fill,
                      borderRadius: 55,
                      pointerEvents: "none",
                      background:
                        "linear-gradient(121deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,.04) 24%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 80%, rgba(255,255,255,.04) 100%)",
                      boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,.55), inset 0 0 22px rgba(0,0,0,.28)",
                    }}
                  />
                </div>

                  {/* Sheen across the whole front glass, bezel included */}
                  <div
                    style={{
                      ...abs,
                      left: 6,
                      top: 6,
                      width: 429,
                      height: 888,
                      clipPath: BEZEL_CLIP,
                      pointerEvents: "none",
                      background:
                        "linear-gradient(121deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 22%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 70%, rgba(255,255,255,.06) 86%, rgba(255,255,255,0) 100%)",
                      transform: "translateZ(1.2px)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Floating cards, in front of the phone in depth */}
            <div className="hd-badge" style={{ ...abs, zIndex: 3, transform: "translateZ(70px)" }}>
            <div
              className="hd-float"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.75)",
                background: "rgba(255,255,255,.72)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                padding: "8px 14px 8px 10px",
                boxShadow: "0 16px 44px rgba(18,24,38,.14)",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: 22,
                  height: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "#e6f2ee",
                  color: "#38584d",
                }}
              >
                <LockIcon size={12} width={2.4} />
              </span>
              <span style={{ fontSize: "clamp(11px, 2.6vw, 12.5px)", fontWeight: 600, color: "#172033" }}>{copy.cards.privateBadge}</span>
            </div>
          </div>

            <div className="hd-qr" style={{ ...abs, top: "62%", width: "clamp(84px, 32%, 128px)", zIndex: 3, transform: "translateZ(60px)" }}>
            <div
              className="hd-float hd-float-late"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderRadius: 20,
                border: "1px solid rgba(0,0,0,.08)",
                background: "rgba(255,255,255,.82)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                padding: "12px 12px 10px",
                boxShadow: "0 16px 44px rgba(18,24,38,.16)",
              }}
            >
              <div className="aspect-square w-full bg-white [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p
                style={{
                  marginTop: 8,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: 8.5,
                  lineHeight: 1.35,
                  fontWeight: 500,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "rgba(0,0,0,.5)",
                  textWrap: "balance",
                }}
              >
                {copy.cards.qrLabel}
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
