// Starting-point presets for the QR card editor. Each preset is a list of
// Fabric.js-compatible object descriptors keyed against a 1240×1754 viewBox
// (A4 portrait at print-friendly dimensions).
//
// Three luxury wedding directions ported from the Claude Design artifact
// "Wedding QR Sign" (Olivia & James prototype). The design was authored at
// 559×794; positions/sizes are scaled by 1240/559 ≈ 2.218.

export type PresetObjectKind = "rect" | "line" | "text" | "qr-slot" | "svg";

export interface PresetObjectBase {
  kind: PresetObjectKind;
  left: number;
  top: number;
}

export interface PresetRect extends PresetObjectBase {
  kind: "rect";
  width: number;
  height: number;
  fill: string;
  rx?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface PresetLine extends PresetObjectBase {
  kind: "line";
  width: number;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
}

export interface PresetText extends PresetObjectBase {
  kind: "text";
  width: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontStyle?: "italic" | "normal";
  fontWeight?: number | string;
  textAlign?: "left" | "center" | "right";
  charSpacing?: number;
  template?: boolean;
}

export interface PresetQrSlot extends PresetObjectBase {
  kind: "qr-slot";
  size: number;
}

export interface PresetSvg extends PresetObjectBase {
  kind: "svg";
  width: number;
  height: number;
  svg: string;
  opacity?: number;
}

export type PresetObject = PresetRect | PresetLine | PresetText | PresetQrSlot | PresetSvg;

export interface CardPreset {
  id: string;
  name: string;
  background: string;
  objects: PresetObject[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand tokens
// ─────────────────────────────────────────────────────────────────────────────
const GOLD = "#C9A86A";       // primary accent
const PAPER = "#FBF8F3";      // cream background
const BORDER = "#EFE6D6";     // outer card border
const INK = "#4F4131";        // h1 deep brown
const BODY = "#7A6A52";       // body text
const KICKER = "#8A7657";     // small caps
const META = "#A2926F";       // date/meta
const ITALIC = "#6E5D45";     // italic tagline
const QR_BG = "#F4ECDE";      // sandy QR plate
const QR_BORDER = "#D9C7A2";  // QR plate border
const QR_INNER = "#EADBBE";   // QR inner border

const SERIF = "Playfair Display";
const SANS = "Jost";

// ─────────────────────────────────────────────────────────────────────────────
// SVG decoration helpers — these are inline SVG strings parsed by Fabric.js
// into Group objects. Gold uses #C9A86A directly (no CSS variables, since
// loadSVGFromString does not resolve `var(--gold)`).
// ─────────────────────────────────────────────────────────────────────────────

/** Eucalyptus sprig — curved central stem with 8 leaves. ~118×150 native. */
const EUCALYPTUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 150" width="118" height="150">
  <g fill="none" stroke="${GOLD}" stroke-width="1" stroke-linecap="round">
    <path d="M14 6 C 30 36, 46 70, 55 108 C 59 122, 60 134, 60 146" stroke-width="1.1"/>
    <ellipse cx="28" cy="28" rx="10" ry="5.8" transform="rotate(-32 28 28)"/>
    <ellipse cx="48" cy="32" rx="10" ry="5.8" transform="rotate(30 48 32)"/>
    <ellipse cx="38" cy="54" rx="10.5" ry="6.2" transform="rotate(-27 38 54)"/>
    <ellipse cx="58" cy="60" rx="10.5" ry="6.2" transform="rotate(33 58 60)"/>
    <ellipse cx="48" cy="82" rx="10" ry="5.8" transform="rotate(-22 48 82)"/>
    <ellipse cx="66" cy="90" rx="10" ry="5.8" transform="rotate(35 66 90)"/>
    <ellipse cx="56" cy="110" rx="9" ry="5.4" transform="rotate(-18 56 110)"/>
    <ellipse cx="60" cy="130" rx="7.5" ry="4.6" transform="rotate(20 60 130)"/>
  </g>
</svg>`;

/** Horizontally mirrored eucalyptus (for top-right corner). */
const EUCALYPTUS_MIRROR_H_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 150" width="118" height="150">
  <g fill="none" stroke="${GOLD}" stroke-width="1" stroke-linecap="round" transform="translate(118 0) scale(-1 1)">
    <path d="M14 6 C 30 36, 46 70, 55 108 C 59 122, 60 134, 60 146" stroke-width="1.1"/>
    <ellipse cx="28" cy="28" rx="10" ry="5.8" transform="rotate(-32 28 28)"/>
    <ellipse cx="48" cy="32" rx="10" ry="5.8" transform="rotate(30 48 32)"/>
    <ellipse cx="38" cy="54" rx="10.5" ry="6.2" transform="rotate(-27 38 54)"/>
    <ellipse cx="58" cy="60" rx="10.5" ry="6.2" transform="rotate(33 58 60)"/>
    <ellipse cx="48" cy="82" rx="10" ry="5.8" transform="rotate(-22 48 82)"/>
    <ellipse cx="66" cy="90" rx="10" ry="5.8" transform="rotate(35 66 90)"/>
    <ellipse cx="56" cy="110" rx="9" ry="5.4" transform="rotate(-18 56 110)"/>
    <ellipse cx="60" cy="130" rx="7.5" ry="4.6" transform="rotate(20 60 130)"/>
  </g>
</svg>`;

/** Vertically mirrored eucalyptus (for bottom-left corner). */
const EUCALYPTUS_MIRROR_V_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 150" width="118" height="150">
  <g fill="none" stroke="${GOLD}" stroke-width="1" stroke-linecap="round" transform="translate(0 150) scale(1 -1)">
    <path d="M14 6 C 30 36, 46 70, 55 108 C 59 122, 60 134, 60 146" stroke-width="1.1"/>
    <ellipse cx="28" cy="28" rx="10" ry="5.8" transform="rotate(-32 28 28)"/>
    <ellipse cx="48" cy="32" rx="10" ry="5.8" transform="rotate(30 48 32)"/>
    <ellipse cx="38" cy="54" rx="10.5" ry="6.2" transform="rotate(-27 38 54)"/>
    <ellipse cx="58" cy="60" rx="10.5" ry="6.2" transform="rotate(33 58 60)"/>
    <ellipse cx="48" cy="82" rx="10" ry="5.8" transform="rotate(-22 48 82)"/>
    <ellipse cx="66" cy="90" rx="10" ry="5.8" transform="rotate(35 66 90)"/>
    <ellipse cx="56" cy="110" rx="9" ry="5.4" transform="rotate(-18 56 110)"/>
    <ellipse cx="60" cy="130" rx="7.5" ry="4.6" transform="rotate(20 60 130)"/>
  </g>
</svg>`;

/** Both axes mirrored eucalyptus (for bottom-right corner). */
const EUCALYPTUS_MIRROR_BOTH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 150" width="118" height="150">
  <g fill="none" stroke="${GOLD}" stroke-width="1" stroke-linecap="round" transform="translate(118 150) scale(-1 -1)">
    <path d="M14 6 C 30 36, 46 70, 55 108 C 59 122, 60 134, 60 146" stroke-width="1.1"/>
    <ellipse cx="28" cy="28" rx="10" ry="5.8" transform="rotate(-32 28 28)"/>
    <ellipse cx="48" cy="32" rx="10" ry="5.8" transform="rotate(30 48 32)"/>
    <ellipse cx="38" cy="54" rx="10.5" ry="6.2" transform="rotate(-27 38 54)"/>
    <ellipse cx="58" cy="60" rx="10.5" ry="6.2" transform="rotate(33 58 60)"/>
    <ellipse cx="48" cy="82" rx="10" ry="5.8" transform="rotate(-22 48 82)"/>
    <ellipse cx="66" cy="90" rx="10" ry="5.8" transform="rotate(35 66 90)"/>
    <ellipse cx="56" cy="110" rx="9" ry="5.4" transform="rotate(-18 56 110)"/>
    <ellipse cx="60" cy="130" rx="7.5" ry="4.6" transform="rotate(20 60 130)"/>
  </g>
</svg>`;

/** Camera-icon kicker — square body with hood + lens. ~48×40 native. */
const CAMERA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 40" width="48" height="40">
  <g fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="9" width="43" height="28" rx="6"/>
    <path d="M16 9l3.2-5h9.6L32 9"/>
    <circle cx="24" cy="23" r="8"/>
    <circle cx="38.5" cy="15.5" r="1.3" fill="${GOLD}" stroke="none"/>
  </g>
</svg>`;

/** Diamond divider — solid 10×10 gold diamond. */
const DIAMOND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">
  <path d="M5 0l5 5-5 5-5-5z" fill="${GOLD}"/>
</svg>`;

/** Sparkle (4-point star) — solid gold. ~24×24 native. */
const SPARKLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12 1.5c.5 5.4 4.6 9.5 10 10-5.4.5-9.5 4.6-10 10-.5-5.4-4.6-9.5-10-10 5.4-.5 9.5-4.6 10-10Z" fill="${GOLD}"/>
</svg>`;

/** Heart — solid gold, lowercase tagline accent. ~24×22 native. */
const HEART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 22" width="24" height="22">
  <path d="M12 20.5C12 20.5 2.6 14.2 2.6 7.8 2.6 4.5 5.1 2.4 7.9 2.4 9.8 2.4 11.2 3.5 12 4.9 12.8 3.5 14.2 2.4 16.1 2.4 18.9 2.4 21.4 4.5 21.4 7.8 21.4 14.2 12 20.5 12 20.5Z" fill="${GOLD}"/>
</svg>`;

/** Gold L-bracket — for QR corner brackets and outer card corners. ~16×16. */
const L_BRACKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
  <path d="M1 6V1h5" fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;

/** Larger L-bracket for outer card corners in Direction B. ~26×26. */
const L_BRACKET_LARGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" width="26" height="26">
  <path d="M1 9V1h8" fill="none" stroke="${GOLD}" stroke-width="1.1" stroke-linecap="round"/>
</svg>`;

/** Arch QR plate — top semicircle, small bottom rounded corners. 300×344 native. */
const ARCH_PLATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 344" width="300" height="344">
  <path d="M 18 344 L 282 344 A 18 18 0 0 1 300 326 L 300 150 A 150 150 0 0 0 0 150 L 0 326 A 18 18 0 0 1 18 344 Z"
        fill="${QR_BG}" stroke="${QR_BORDER}" stroke-width="1"/>
</svg>`;

// Default body copy — the one paragraph each direction shares.
const BODY_COPY = "Pomozi nam da zabilježimo svaki trenutak. Skeniraj QR kod i pošalji svoje fotke i video snimke sa našeg posebnog dana — voljeli bismo da vidimo vjenčanje vašim očima.";
const H1_COPY = "Podijeli svoje uspomene";
const TAGLINE_COPY = "Hvala što ste dio naše priče";

// Scale: design canvas was 559×794, ours is 1240×1754.
const S = 1240 / 559; // ≈ 2.218

// ─────────────────────────────────────────────────────────────────────────────
// Direction A — Classic Centered
// Double inner gold border, eucalyptus sprig top-left + bottom-right, camera
// icon, diamond divider, gold-corner-bracket QR plate.
// ─────────────────────────────────────────────────────────────────────────────
const directionA: CardPreset = {
  id: "wedding-classic",
  name: "Klasičan centriran",
  background: PAPER,
  objects: [
    // Outer card uses the page background — no extra rect needed.
    // Double inner gold border (the two inset rects on the design)
    { kind: "rect", left: 16 * S, top: 16 * S, width: (559 - 32) * S, height: (794 - 32) * S, fill: "transparent", stroke: GOLD, strokeWidth: 1, opacity: 0.4, rx: 10 },
    { kind: "rect", left: 20 * S, top: 20 * S, width: (559 - 40) * S, height: (794 - 40) * S, fill: "transparent", stroke: GOLD, strokeWidth: 1, opacity: 0.28, rx: 8 },

    // Eucalyptus sprigs (top-left + bottom-right)
    { kind: "svg", left: 20 * S, top: 24 * S, width: 116 * S, height: 148 * S, svg: EUCALYPTUS_SVG, opacity: 0.42 },
    { kind: "svg", left: (559 - 20 - 116) * S, top: (794 - 24 - 148) * S, width: 116 * S, height: 148 * S, svg: EUCALYPTUS_MIRROR_BOTH_SVG, opacity: 0.42 },

    // Camera icon (centred near top)
    { kind: "svg", left: (559 / 2 - 11) * S, top: 54 * S, width: 22 * S, height: 19 * S, svg: CAMERA_SVG },

    // Kicker — couple names
    { kind: "text", left: 0, top: 87 * S, width: 1240, text: "{{title}}", fontFamily: SANS, fontWeight: 500, fontSize: 12 * S, fill: KICKER, textAlign: "center", charSpacing: 333, template: true },
    // Date
    { kind: "text", left: 0, top: 108 * S, width: 1240, text: "{{date}}", fontFamily: SANS, fontWeight: 400, fontSize: 9.5 * S, fill: META, textAlign: "center", charSpacing: 263, template: true },

    // H1
    { kind: "text", left: 0, top: 130 * S, width: 1240, text: H1_COPY, fontFamily: SERIF, fontWeight: 500, fontSize: 35 * S, fill: INK, textAlign: "center" },

    // Diamond divider (replaces a 3-piece line + diamond + line). Just the diamond centred.
    { kind: "svg", left: (559 / 2 - 4) * S, top: 197 * S, width: 8 * S, height: 8 * S, svg: DIAMOND_SVG, opacity: 0.6 },

    // Body paragraph (3 lines @ ~13px)
    { kind: "text", left: 86 * S, top: 220 * S, width: (559 - 172) * S, text: BODY_COPY, fontFamily: SANS, fontWeight: 300, fontSize: 13 * S, fill: BODY, textAlign: "center" },

    // QR plate (centred between top stack and bottom stack)
    { kind: "rect", left: (559 / 2 - 142) * S, top: 351 * S, width: 284 * S, height: 284 * S, fill: "#ffffff", stroke: QR_BORDER, strokeWidth: 1.5, rx: 12 },
    { kind: "rect", left: (559 / 2 - 142 + 7) * S, top: (351 + 7) * S, width: (284 - 14) * S, height: (284 - 14) * S, fill: "transparent", stroke: QR_INNER, strokeWidth: 1, rx: 7 },
    { kind: "qr-slot", left: (559 / 2 - 142 + 16) * S, top: (351 + 16) * S, size: (284 - 32) * S },

    // QR corner brackets
    { kind: "svg", left: (559 / 2 - 142 - 7) * S, top: (351 - 7) * S, width: 16 * S, height: 16 * S, svg: L_BRACKET_SVG },
    { kind: "svg", left: (559 / 2 + 142 - 9) * S, top: (351 - 7) * S, width: 16 * S, height: 16 * S, svg: L_BRACKET_LARGE_SVG },
    { kind: "svg", left: (559 / 2 - 142 - 7) * S, top: (351 + 284 - 9) * S, width: 16 * S, height: 16 * S, svg: L_BRACKET_LARGE_SVG },
    { kind: "svg", left: (559 / 2 + 142 - 9) * S, top: (351 + 284 - 9) * S, width: 16 * S, height: 16 * S, svg: L_BRACKET_LARGE_SVG },

    // SCAN ◆ UPLOAD ◆ SHARE row
    { kind: "text", left: 0, top: 660 * S, width: 1240, text: "SKENIRAJ ◆ POŠALJI ◆ PODIJELI", fontFamily: SANS, fontWeight: 500, fontSize: 12.5 * S, fill: BODY, textAlign: "center", charSpacing: 360 },

    // Italic tagline + heart
    { kind: "text", left: 0, top: 700 * S, width: 1240, text: TAGLINE_COPY, fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 15.5 * S, fill: ITALIC, textAlign: "center" },
    // Heart — centred on its own line below the tagline.
    { kind: "svg", left: (559 / 2 - 7.5) * S, top: 728 * S, width: 15 * S, height: 14 * S, svg: HEART_SVG },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Direction B — Modern Arch
// Four L-brackets at corners, arch-shaped QR frame, sparkle accent above QR.
// ─────────────────────────────────────────────────────────────────────────────
const directionB: CardPreset = {
  id: "wedding-arch",
  name: "Moderni luk",
  background: PAPER,
  objects: [
    // Four L-brackets at outer corners
    { kind: "svg", left: 22 * S, top: 22 * S, width: 26 * S, height: 26 * S, svg: L_BRACKET_LARGE_SVG, opacity: 0.65 },
    { kind: "svg", left: (559 - 22 - 26) * S, top: 22 * S, width: 26 * S, height: 26 * S, svg: rotateSvg(L_BRACKET_LARGE_SVG, 90, 26, 26), opacity: 0.65 },
    { kind: "svg", left: (559 - 22 - 26) * S, top: (794 - 22 - 26) * S, width: 26 * S, height: 26 * S, svg: rotateSvg(L_BRACKET_LARGE_SVG, 180, 26, 26), opacity: 0.65 },
    { kind: "svg", left: 22 * S, top: (794 - 22 - 26) * S, width: 26 * S, height: 26 * S, svg: rotateSvg(L_BRACKET_LARGE_SVG, 270, 26, 26), opacity: 0.65 },

    // Kicker — couple names
    { kind: "text", left: 0, top: 62 * S, width: 1240, text: "{{title}}", fontFamily: SANS, fontWeight: 500, fontSize: 13 * S, fill: KICKER, textAlign: "center", charSpacing: 461, template: true },

    // Date with side lines (centred — emulating the 24px-line ◀ DATE ▶ 24px-line layout)
    { kind: "text", left: 0, top: 90 * S, width: 1240, text: "{{date}}", fontFamily: SANS, fontWeight: 400, fontSize: 9.5 * S, fill: META, textAlign: "center", charSpacing: 315, template: true },

    // H1
    { kind: "text", left: 0, top: 124 * S, width: 1240, text: H1_COPY, fontFamily: SERIF, fontWeight: 500, fontSize: 33 * S, fill: INK, textAlign: "center" },

    // Body paragraph
    { kind: "text", left: 93 * S, top: 200 * S, width: (559 - 186) * S, text: BODY_COPY, fontFamily: SANS, fontWeight: 300, fontSize: 12.5 * S, fill: BODY, textAlign: "center" },

    // Arch QR plate
    { kind: "svg", left: (559 / 2 - 150) * S, top: 322 * S, width: 300 * S, height: 344 * S, svg: ARCH_PLATE_SVG },

    // Sparkle above QR centre
    { kind: "svg", left: (559 / 2 - 6.5) * S, top: 342 * S, width: 13 * S, height: 13 * S, svg: SPARKLE_SVG, opacity: 0.7 },

    // Inner QR card (white)
    { kind: "rect", left: (559 / 2 - 124) * S, top: 388 * S, width: 248 * S, height: 248 * S, fill: "#ffffff", stroke: QR_BORDER, strokeWidth: 1, rx: 10 },
    { kind: "rect", left: (559 / 2 - 124 + 6) * S, top: (388 + 6) * S, width: (248 - 12) * S, height: (248 - 12) * S, fill: "transparent", stroke: QR_INNER, strokeWidth: 1, rx: 6 },
    { kind: "qr-slot", left: (559 / 2 - 124 + 14) * S, top: (388 + 14) * S, size: (248 - 28) * S },

    // SCAN · UPLOAD · SHARE
    { kind: "text", left: 0, top: 690 * S, width: 1240, text: "SKENIRAJ · POŠALJI · PODIJELI", fontFamily: SANS, fontWeight: 500, fontSize: 12 * S, fill: BODY, textAlign: "center", charSpacing: 420 },

    // Italic tagline + heart
    { kind: "text", left: 0, top: 728 * S, width: 1240, text: TAGLINE_COPY, fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 15 * S, fill: ITALIC, textAlign: "center" },
    // Heart — centred on its own line below the tagline.
    { kind: "svg", left: (559 / 2 - 7) * S, top: 755 * S, width: 14 * S, height: 13 * S, svg: HEART_SVG },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Direction C — Romantic Botanical
// Single thin border, eucalyptus sprigs at all four corners, sparkle accents.
// ─────────────────────────────────────────────────────────────────────────────
const directionC: CardPreset = {
  id: "wedding-botanical",
  name: "Romantičan botanički",
  background: PAPER,
  objects: [
    // Single inner gold border
    { kind: "rect", left: 18 * S, top: 18 * S, width: (559 - 36) * S, height: (794 - 36) * S, fill: "transparent", stroke: GOLD, strokeWidth: 1, opacity: 0.32, rx: 11 },

    // 4 eucalyptus sprigs — top-left (natural), top-right (h-mirror), bottom-left (v-mirror), bottom-right (both)
    { kind: "svg", left: 10 * S, top: 14 * S, width: 104 * S, height: 132 * S, svg: EUCALYPTUS_SVG, opacity: 0.5 },
    { kind: "svg", left: (559 - 10 - 104) * S, top: 14 * S, width: 104 * S, height: 132 * S, svg: EUCALYPTUS_MIRROR_H_SVG, opacity: 0.5 },
    { kind: "svg", left: 10 * S, top: (794 - 14 - 132) * S, width: 104 * S, height: 132 * S, svg: EUCALYPTUS_MIRROR_V_SVG, opacity: 0.5 },
    { kind: "svg", left: (559 - 10 - 104) * S, top: (794 - 14 - 132) * S, width: 104 * S, height: 132 * S, svg: EUCALYPTUS_MIRROR_BOTH_SVG, opacity: 0.5 },

    // Italic-Playfair couple names (different from A/B — these are display, not kicker)
    { kind: "text", left: 0, top: 52 * S, width: 1240, text: "{{title}}", fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 22 * S, fill: KICKER, textAlign: "center", template: true },
    // Date
    { kind: "text", left: 0, top: 88 * S, width: 1240, text: "{{date}}", fontFamily: SANS, fontWeight: 400, fontSize: 9.5 * S, fill: META, textAlign: "center", charSpacing: 315, template: true },

    // H1
    { kind: "text", left: 0, top: 118 * S, width: 1240, text: H1_COPY, fontFamily: SERIF, fontWeight: 500, fontSize: 33 * S, fill: INK, textAlign: "center" },

    // Sparkle divider
    { kind: "svg", left: (559 / 2 - 6.5) * S, top: 184 * S, width: 13 * S, height: 13 * S, svg: SPARKLE_SVG, opacity: 0.8 },

    // Body paragraph
    { kind: "text", left: 92 * S, top: 215 * S, width: (559 - 184) * S, text: BODY_COPY, fontFamily: SANS, fontWeight: 300, fontSize: 12.5 * S, fill: BODY, textAlign: "center" },

    // QR plate — rounded sandy rect with white QR card inside
    { kind: "rect", left: (559 / 2 - 150) * S, top: 360 * S, width: 300 * S, height: 300 * S, fill: QR_BG, stroke: QR_BORDER, strokeWidth: 1, rx: 20 },
    { kind: "rect", left: (559 / 2 - 128) * S, top: (360 + 22) * S, width: 256 * S, height: 256 * S, fill: "#ffffff", stroke: QR_BORDER, strokeWidth: 1, rx: 10 },
    { kind: "rect", left: (559 / 2 - 128 + 6) * S, top: (360 + 22 + 6) * S, width: (256 - 12) * S, height: (256 - 12) * S, fill: "transparent", stroke: QR_INNER, strokeWidth: 1, rx: 6 },
    { kind: "qr-slot", left: (559 / 2 - 128 + 14) * S, top: (360 + 22 + 14) * S, size: (256 - 28) * S },

    // Small sparkle accents on QR plate (top-right + bottom-left of the sandy rect)
    { kind: "svg", left: (559 / 2 + 150 - 26) * S, top: (360 + 13) * S, width: 11 * S, height: 11 * S, svg: SPARKLE_SVG, opacity: 0.65 },
    { kind: "svg", left: (559 / 2 - 150 + 16) * S, top: (360 + 300 - 23) * S, width: 9 * S, height: 9 * S, svg: SPARKLE_SVG, opacity: 0.55 },

    // SCAN ✿ UPLOAD ✿ SHARE
    { kind: "text", left: 0, top: 685 * S, width: 1240, text: "SKENIRAJ ✿ POŠALJI ✿ PODIJELI", fontFamily: SANS, fontWeight: 500, fontSize: 12 * S, fill: BODY, textAlign: "center", charSpacing: 380 },

    // Italic tagline + heart
    { kind: "text", left: 0, top: 723 * S, width: 1240, text: TAGLINE_COPY, fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 15.5 * S, fill: ITALIC, textAlign: "center" },
    // Heart — centred on its own line below the tagline.
    { kind: "svg", left: (559 / 2 - 7.5) * S, top: 750 * S, width: 15 * S, height: 14 * S, svg: HEART_SVG },
  ],
};

// ── Rotate an inline SVG by wrapping its content in a <g transform="rotate">.
//    Returns the same SVG element with the rotation baked in around the centre.
function rotateSvg(svg: string, deg: number, w: number, h: number): string {
  return svg.replace(
    /<svg([^>]*)>([\s\S]*)<\/svg>/,
    (_match, attrs, inner) => `<svg${attrs}><g transform="rotate(${deg} ${w / 2} ${h / 2})">${inner}</g></svg>`,
  );
}

export const CARD_PRESETS: CardPreset[] = [directionA, directionB, directionC];

export const CANVAS_WIDTH = 1240;
export const CANVAS_HEIGHT = 1754;
