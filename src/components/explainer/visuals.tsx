// @ts-nocheck
/* eslint-disable */
// Ported verbatim from the Confetti explainer's visuals.jsx. Only the module
// wiring changed (imports instead of window globals). Visual logic is unchanged.

import React from "react";
import { Easing, useSprite } from "./animations";

// ── Brand tokens ────────────────────────────────────────────────────────────
export const CFI = {
  paper: "#f2eadf",
  paperLight: "#fbf7f1",
  paperDeep: "#ece2d3",
  ink: "#172033",
  inkSoft: "#3a4258",
  accent: "#e27952",
  accentSoft: "#f6d3c3",
  moss: "#38584d",
  mossSoft: "#cdd9d2",
  rule: "rgba(23,32,51,0.12)",
  display: "'Playfair Display', Georgia, serif",
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace",
};

// ── Background ──────────────────────────────────────────────────────────────
export function PaperBackground({ vignette = true }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `
        radial-gradient(circle at 12% 10%, rgba(226,121,82,0.22), transparent 32%),
        radial-gradient(circle at 90% 14%, rgba(56,88,77,0.18), transparent 28%),
        radial-gradient(circle at 50% 100%, rgba(226,121,82,0.10), transparent 42%),
        linear-gradient(180deg, #fffaf4 0%, #f6eee2 50%, #ece2d3 100%)
      `,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(23,32,51,0.04) 1px, transparent 1px)",
        backgroundSize: "3px 3px",
        opacity: 0.6,
        mixBlendMode: "multiply",
      }} />
      {vignette &&
        <div style={{
          position: "absolute", inset: 0,
          boxShadow: "inset 0 0 240px rgba(23,32,51,0.08)",
          pointerEvents: "none",
        }} />
      }
    </div>
  );
}

// ── Striped placeholder photo OR real image when `src` is provided ──────────
export function StripedPlate({
  label = "PHOTO",
  hue = "paper",
  size = 13,
  align = "bottom",
  src,
  objectPosition = "center",
}) {
  const [failed, setFailed] = React.useState(false);
  const showImage = src && !failed;

  const palettes = {
    paper: ["#e9e1d3", "#d9cfbd"],
    warm: ["#f1c8b3", "#e9b59a"],
    cool: ["#cfd9d3", "#b9c8c0"],
    dark: ["#3b4358", "#2a3149"],
  };
  const [a, b] = palettes[hue] || palettes.paper;
  const labelColor = hue === "dark" ? "rgba(246,244,239,0.78)" : "rgba(23,32,51,0.62)";

  if (showImage) {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", background: a }}>
        <img
          src={src}
          alt=""
          loading="lazy"
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition,
            display: "block",
          }}
          onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      position: "relative",
      background: `repeating-linear-gradient(135deg, ${a} 0 12px, ${b} 12px 24px)`,
      display: "flex",
      alignItems: align === "center" ? "center" : align === "top" ? "flex-start" : "flex-end",
      justifyContent: align === "center" ? "center" : "flex-start",
      padding: align === "center" ? 0 : 12,
    }}>
      <span style={{
        fontFamily: CFI.mono,
        fontSize: size,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: labelColor,
        background: hue === "dark" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.62)",
        padding: "3px 8px",
        borderRadius: 3,
        backdropFilter: "blur(2px)",
      }}>
        {label}
      </span>
    </div>
  );
}

// ── A printed photo card ────────────────────────────────────────────────────
export function PhotoCard({
  width, height,
  label = "PHOTO",
  hue = "paper",
  rotate = 0,
  shadow = "lg",
  caption,
  captionFont = "display",
  border = 14,
  radius = 4,
  src,
  objectPosition = "center",
}) {
  const shadows = {
    sm: "0 4px 14px rgba(23,32,51,0.10), 0 1px 2px rgba(23,32,51,0.06)",
    md: "0 12px 28px rgba(23,32,51,0.16), 0 2px 6px rgba(23,32,51,0.08)",
    lg: "0 24px 50px rgba(23,32,51,0.22), 0 4px 10px rgba(23,32,51,0.10)",
  };
  return (
    <div style={{
      width, height,
      transform: `rotate(${rotate}deg)`,
      background: "#fffaf2",
      borderRadius: radius,
      boxShadow: shadows[shadow],
      padding: border,
      paddingBottom: caption ? border + 86 : border,
      position: "relative",
    }}>
      <div style={{
        width: "100%",
        height: caption ? `calc(100% - 86px)` : "100%",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <StripedPlate label={label} hue={hue} src={src} objectPosition={objectPosition} />
      </div>
      {caption &&
        <div style={{
          position: "absolute",
          left: border, right: border, bottom: border + 14,
          color: CFI.inkSoft,
        }}>{caption}</div>
      }
    </div>
  );
}

// ── Phone frame ─────────────────────────────────────────────────────────────
export function PhoneFrame({
  width = 220,
  children,
  bezel = 12,
  notch = true,
  shadow = "0 18px 40px rgba(23,32,51,0.22), 0 4px 10px rgba(23,32,51,0.10)",
  screen = "#fffaf2",
}) {
  const height = width * (852 / 420);
  return (
    <div style={{
      width, height,
      background: "#1a2235",
      borderRadius: width * 0.16,
      padding: bezel,
      boxShadow: shadow,
      position: "relative",
    }}>
      <div style={{
        width: "100%", height: "100%",
        background: screen,
        borderRadius: width * 0.13,
        overflow: "hidden",
        position: "relative",
      }}>
        {notch &&
          <div style={{
            position: "absolute",
            top: 6, left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.32,
            height: 14,
            background: "#1a2235",
            borderRadius: 999,
          }} />
        }
        {children}
      </div>
    </div>
  );
}

// ── QR code (procedural placeholder) ────────────────────────────────────────
export function QRPlate({ size = 200, modules = 21, seed = 7 }) {
  const cells = React.useMemo(() => {
    const out = [];
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let r = 0; r < modules; r++) {
      const row = [];
      for (let c = 0; c < modules; c++) {
        row.push(rand() > 0.5 ? 1 : 0);
      }
      out.push(row);
    }
    const stamp = (r, c) => {
      for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
        const inner = dr >= 1 && dr <= 5 && dc >= 1 && dc <= 5;
        const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        out[r + dr][c + dc] = !inner || core ? 1 : 0;
      }
    };
    stamp(0, 0); stamp(0, modules - 7); stamp(modules - 7, 0);
    return out;
  }, [modules, seed]);

  const cell = size / modules;
  return (
    <div style={{
      width: size, height: size,
      background: "#fffaf2",
      padding: cell * 1.2,
      borderRadius: 8,
      boxSizing: "border-box",
    }}>
      <svg viewBox={`0 0 ${modules} ${modules}`} width="100%" height="100%" shapeRendering="crispEdges">
        {cells.map((row, r) =>
          row.map((v, c) =>
            v ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill={CFI.ink} /> : null
          )
        )}
      </svg>
    </div>
  );
}

// ── Confetti burst ──────────────────────────────────────────────────────────
export function ConfettiBurst({ x, y, count = 60, start = 0, end = 1.4, scale = 1 }) {
  const parent = useSprite();
  const pieces = React.useMemo(() => {
    const out = [];
    let s = 113;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const colors = [CFI.accent, CFI.moss, "#f0c25c", CFI.accentSoft, CFI.ink, "#d36b48"];
    for (let i = 0; i < count; i++) {
      const angle = r() * Math.PI * 2;
      const dist = 80 + r() * 280;
      out.push({
        angle, dist,
        size: 4 + r() * 9,
        color: colors[Math.floor(r() * colors.length)],
        rot: r() * 720 - 360,
        delay: r() * 0.18,
        shape: r() > 0.5 ? "rect" : "circle",
        gravity: 40 + r() * 80,
      });
    }
    return out;
  }, [count]);

  const pt = parent.localTime;
  if (pt < start || pt > end) return null;

  const localTime = pt - start;
  const duration = end - start;

  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      {pieces.map((p, i) => {
        const t0 = Math.max(0, (localTime - p.delay) / Math.max(0.001, duration - p.delay));
        const t = Math.min(1, t0);
        const eased = Easing.easeOutCubic(t);
        const dx = Math.cos(p.angle) * p.dist * eased * scale;
        const dy = Math.sin(p.angle) * p.dist * eased * scale + p.gravity * t * t;
        const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
        return (
          <div key={i} style={{
            position: "absolute",
            width: p.size, height: p.size * (p.shape === "rect" ? 0.5 : 1),
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 1,
            transform: `translate(${dx}px, ${dy}px) rotate(${p.rot * t}deg)`,
            opacity,
            left: -p.size / 2, top: -p.size / 2,
          }} />
        );
      })}
    </div>
  );
}

// ── Typography helpers ──────────────────────────────────────────────────────
export function Kicker({ children, color = CFI.accent }) {
  return (
    <div style={{
      fontFamily: CFI.mono,
      fontSize: 13,
      letterSpacing: "0.32em",
      textTransform: "uppercase",
      color,
    }}>{children}</div>
  );
}

export function Display({ children, size = 96, color = CFI.ink, style = {} }) {
  return (
    <div style={{ ...{
      fontFamily: CFI.display,
      fontSize: size,
      fontWeight: 500,
      color,
      letterSpacing: "-0.015em",
      lineHeight: 1.05,
      textWrap: "pretty",
      ...style, borderStyle: "solid", borderWidth: "0px",
    }, color: "rgb(0, 0, 0)" }}>{children}</div>
  );
}

export function Caption({ children, size = 22, color = CFI.inkSoft, style = {} }) {
  return (
    <div style={{
      fontFamily: CFI.sans,
      fontSize: size,
      fontWeight: 400,
      color,
      letterSpacing: "-0.005em",
      lineHeight: 1.4,
      ...style,
    }}>{children}</div>
  );
}
