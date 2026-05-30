// Starting-point presets for the QR card editor. Each preset defines a list of
// Fabric.js-compatible object descriptors keyed against a 1240×1754 viewBox
// (same canvas size as the printable PNG templates, A4 portrait). The editor
// hydrates these into real Fabric objects, layered in the order they appear.
//
// We keep the presets as plain data (no fabric imports here) so the file stays
// safe for both server + client contexts.

export type PresetObjectKind = "rect" | "line" | "text" | "qr-slot";

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
}

export interface PresetLine extends PresetObjectBase {
  kind: "line";
  /** Width of the line (height stays at strokeWidth). */
  width: number;
  stroke: string;
  strokeWidth: number;
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
  charSpacing?: number; // 1/1000 em — Fabric's letterSpacing analogue
  /** When true the editor swaps `{{title}}`/`{{date}}` placeholders. */
  template?: boolean;
}

export interface PresetQrSlot extends PresetObjectBase {
  kind: "qr-slot";
  size: number;
  /** Cream pad behind the QR — optional. */
  padFill?: string;
  padRadius?: number;
}

export type PresetObject = PresetRect | PresetLine | PresetText | PresetQrSlot;

export interface CardPreset {
  id: string;
  name: string;
  background: string;
  objects: PresetObject[];
}

const C = {
  cream: "#fffaf2",
  paper: "#f2eadf",
  paperLight: "#fbf7f1",
  ink: "#172033",
  inkSoft: "#3a4258",
  accent: "#e27952",
  moss: "#38584d",
};

const SERIF = "Playfair Display";
const SANS = "Inter";
const MONO = "JetBrains Mono";

export const CARD_PRESETS: CardPreset[] = [
  {
    id: "minimal-cream",
    name: "Minimal Cream",
    background: C.cream,
    objects: [
      { kind: "text", left: 0, top: 200, width: 1240, text: "DOBRODOŠLI NA", fontFamily: MONO, fontSize: 28, fill: C.moss, textAlign: "center", charSpacing: 800 },
      { kind: "text", left: 0, top: 300, width: 1240, text: "{{title}}", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 96, fill: C.ink, textAlign: "center", template: true },
      { kind: "line", left: 500, top: 440, width: 240, stroke: C.accent, strokeWidth: 3 },
      { kind: "rect", left: 320, top: 540, width: 600, height: 600, fill: C.paperLight, rx: 24 },
      { kind: "qr-slot", left: 370, top: 590, size: 500 },
      { kind: "text", left: 0, top: 1260, width: 1240, text: "Skeniraj telefonom i ostavi", fontFamily: SANS, fontSize: 42, fill: C.ink, textAlign: "center" },
      { kind: "text", left: 0, top: 1320, width: 1240, text: "svoje fotke sa današnjeg dana.", fontFamily: SERIF, fontStyle: "italic", fontSize: 42, fill: C.accent, textAlign: "center" },
      { kind: "text", left: 0, top: 1650, width: 1240, text: "Powered by Confetti", fontFamily: SERIF, fontStyle: "italic", fontSize: 32, fill: C.ink, textAlign: "center" },
    ],
  },
  {
    id: "confetti-burst",
    name: "Confetti Burst",
    background: C.cream,
    objects: [
      { kind: "rect", left: 0, top: 0, width: 1240, height: 440, fill: C.accent },
      { kind: "text", left: 0, top: 145, width: 1240, text: "PRIVATNA GALERIJA", fontFamily: MONO, fontSize: 26, fill: C.cream, textAlign: "center", charSpacing: 900 },
      { kind: "text", left: 0, top: 260, width: 1240, text: "{{title}}", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 108, fill: C.cream, textAlign: "center", template: true },
      { kind: "rect", left: 290, top: 640, width: 660, height: 660, fill: C.paperLight, rx: 32 },
      { kind: "qr-slot", left: 345, top: 695, size: 550 },
      { kind: "text", left: 0, top: 1390, width: 1240, text: "Sve sa večeri —", fontFamily: SANS, fontSize: 46, fill: C.ink, textAlign: "center" },
      { kind: "text", left: 0, top: 1450, width: 1240, text: "na jednom mjestu.", fontFamily: SERIF, fontStyle: "italic", fontSize: 46, fill: C.accent, textAlign: "center" },
      { kind: "text", left: 0, top: 1660, width: 1240, text: "Powered by Confetti", fontFamily: SERIF, fontStyle: "italic", fontSize: 32, fill: C.ink, textAlign: "center" },
    ],
  },
  {
    id: "polaroid",
    name: "Polaroid",
    background: C.paper,
    objects: [
      { kind: "text", left: 0, top: 160, width: 1240, text: "SKENIRAJ I PODIJELI", fontFamily: MONO, fontSize: 26, fill: C.moss, textAlign: "center", charSpacing: 800 },
      { kind: "rect", left: 260, top: 540, width: 720, height: 900, fill: "#ffffff", rx: 14 },
      { kind: "rect", left: 300, top: 580, width: 640, height: 640, fill: C.paperLight },
      { kind: "qr-slot", left: 340, top: 620, size: 560 },
      { kind: "text", left: 0, top: 1280, width: 1240, text: "{{title}}", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 68, fill: C.ink, textAlign: "center", template: true },
      { kind: "text", left: 0, top: 1360, width: 1240, text: "{{date}}", fontFamily: MONO, fontSize: 22, fill: C.inkSoft, textAlign: "center", charSpacing: 600, template: true },
      { kind: "text", left: 0, top: 1560, width: 1240, text: "Uslikaj. Dijeli. Sjećaj se.", fontFamily: SANS, fontSize: 44, fill: C.ink, textAlign: "center" },
    ],
  },
  {
    id: "editorial",
    name: "Editorial",
    background: C.cream,
    objects: [
      { kind: "rect", left: 120, top: 120, width: 1000, height: 4, fill: C.moss },
      { kind: "text", left: 0, top: 180, width: 1240, text: "PRIVATNA GALERIJA · {{date}}", fontFamily: MONO, fontSize: 24, fill: C.moss, textAlign: "center", charSpacing: 800, template: true },
      { kind: "text", left: 0, top: 340, width: 1240, text: "{{title}}", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 120, fill: C.ink, textAlign: "center", template: true },
      { kind: "line", left: 540, top: 490, width: 160, stroke: C.accent, strokeWidth: 2 },
      { kind: "rect", left: 320, top: 600, width: 600, height: 600, fill: C.paperLight },
      { kind: "qr-slot", left: 370, top: 650, size: 500 },
      { kind: "text", left: 0, top: 1320, width: 1240, text: "Skeniraj da podijeliš", fontFamily: SANS, fontSize: 44, fill: C.ink, textAlign: "center" },
      { kind: "text", left: 0, top: 1380, width: 1240, text: "svoje trenutke s nama.", fontFamily: SERIF, fontStyle: "italic", fontSize: 44, fill: C.accent, textAlign: "center" },
      { kind: "rect", left: 120, top: 1580, width: 1000, height: 2, fill: C.moss },
    ],
  },
];

export const CANVAS_WIDTH = 1240;
export const CANVAS_HEIGHT = 1754;
