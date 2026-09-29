// Browser-only helpers shared by the QR card editor and the card preview on
// the event's QR page: loading Fabric and the brand fonts, turning a preset
// into Fabric objects, the localStorage draft, and rendering a card to an
// image without putting a canvas on screen.
//
// Nothing here runs at import time, so server components may import the
// types; every function touches `window` only when called.

import { CANVAS_HEIGHT, CANVAS_WIDTH, type CardPreset, type PresetObject } from "@/lib/qr-card-editor/presets";

export type FabricNs = typeof import("fabric");
export type FO = import("fabric").FabricObject;

let fabricModulePromise: Promise<FabricNs> | null = null;
/** Fabric is heavy and window-only, so it is loaded on demand and once. */
export function loadFabric(): Promise<FabricNs> {
  if (!fabricModulePromise) fabricModulePromise = import("fabric");
  return fabricModulePromise;
}

let fontsReadyPromise: Promise<void> | null = null;
/** The brand TTFs from /public, so canvas text renders in the card's fonts. Resolves once per session. */
export function loadBrandFonts(): Promise<void> {
  if (fontsReadyPromise) return fontsReadyPromise;
  const defs: Array<[string, string, FontFaceDescriptors]> = [
    ["Playfair Display", "/fonts/poster/playfair-italic-latin.ttf", { style: "italic", weight: "500 600" }],
    ["Playfair Display", "/fonts/poster/playfair-italic-ext.ttf", { style: "italic", weight: "500 600" }],
    ["Playfair Display", "/fonts/poster/playfair-bold-latin.ttf", { style: "normal", weight: "500 700" }],
    ["Playfair Display", "/fonts/poster/playfair-bold-ext.ttf", { style: "normal", weight: "500 700" }],
    ["Inter", "/fonts/poster/inter-latin.ttf", { style: "normal", weight: "500" }],
    ["Inter", "/fonts/poster/inter-ext.ttf", { style: "normal", weight: "500" }],
    ["JetBrains Mono", "/fonts/poster/jetbrains-mono-latin.ttf", { style: "normal", weight: "500" }],
    ["JetBrains Mono", "/fonts/poster/jetbrains-mono-ext.ttf", { style: "normal", weight: "500" }],
    ["Jost", "/fonts/poster/jost-latin-300.woff2", { style: "normal", weight: "300" }],
    ["Jost", "/fonts/poster/jost-latin-ext-300.woff2", { style: "normal", weight: "300" }],
    ["Jost", "/fonts/poster/jost-latin-400.woff2", { style: "normal", weight: "400" }],
    ["Jost", "/fonts/poster/jost-latin-ext-400.woff2", { style: "normal", weight: "400" }],
    ["Jost", "/fonts/poster/jost-latin-500.woff2", { style: "normal", weight: "500" }],
    ["Jost", "/fonts/poster/jost-latin-ext-500.woff2", { style: "normal", weight: "500" }],
  ];
  fontsReadyPromise = Promise.all(
    defs.map(async ([family, url, descriptors]) => {
      const face = new FontFace(family, `url(${url})`, descriptors);
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  return fontsReadyPromise;
}

// ── Draft persistence (localStorage, keyed by event slug) ────────────────────
// localStorage gives us ~5 MB; stay well under it rather than throwing on
// every keystroke once a big image is on the canvas.
const DRAFT_MAX_BYTES = 3_000_000;

export type DraftShape = { presetId: string; canvas: unknown };

function draftKey(slug: string) {
  return `confetti-qr-draft-${slug}`;
}

export function readDraft(slug: string): DraftShape | null {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftShape;
    return parsed?.canvas ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns whether the draft actually reached storage. */
export function writeDraft(slug: string, draft: DraftShape): boolean {
  try {
    const payload = JSON.stringify(draft);
    // Oversized canvases (a big uploaded image) would throw on every save.
    if (payload.length > DRAFT_MAX_BYTES) return false;
    window.localStorage.setItem(draftKey(slug), payload);
    return true;
  } catch {
    // Quota exceeded / private mode — drafts are best-effort.
    return false;
  }
}

export function clearDraft(slug: string) {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    /* ignore */
  }
}

// ── Presets → Fabric objects ────────────────────────────────────────────────
export type CardContext = { title: string; date: string | null; qrDataUrl: string };

function fillPlaceholders(raw: string, ctx: CardContext) {
  return raw.replace(/\{\{title\}\}/g, ctx.title || "Confetti").replace(/\{\{date\}\}/g, ctx.date || "");
}

/** Render a single preset object into a Fabric object instance. */
export async function buildPresetObject(fabric: FabricNs, obj: PresetObject, ctx: CardContext): Promise<FO | null> {
  switch (obj.kind) {
    case "rect":
      return new fabric.Rect({
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        fill: obj.fill,
        rx: obj.rx ?? 0,
        ry: obj.rx ?? 0,
        strokeWidth: 0,
        // Fabric v7 defaults origin to center; presets author left/top as
        // the object's top-left edge, so anchor there explicitly.
        originX: "left",
        originY: "top",
      });
    case "line":
      return new fabric.Rect({
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.strokeWidth,
        fill: obj.stroke,
        strokeWidth: 0,
        originX: "left",
        originY: "top",
      });
    case "text": {
      // Presets place text by the box's top-left edge, but Fabric v7
      // defaults origin to center on both axes. Recompute the horizontal
      // anchor from the alignment and pin originY to the top so the box
      // lands exactly where the preset's left/top/width intend.
      const align = obj.textAlign ?? "left";
      let leftPos = obj.left;
      let originX: "left" | "center" | "right" = "left";
      if (align === "center") {
        leftPos = obj.left + obj.width / 2;
        originX = "center";
      } else if (align === "right") {
        leftPos = obj.left + obj.width;
        originX = "right";
      }
      return new fabric.Textbox(fillPlaceholders(obj.text, ctx), {
        left: leftPos,
        top: obj.top,
        width: obj.width,
        originX,
        originY: "top",
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontStyle: obj.fontStyle ?? "normal",
        fontWeight: obj.fontWeight ?? "normal",
        fill: obj.fill,
        textAlign: align,
        charSpacing: obj.charSpacing ?? 0,
        editable: true,
      });
    }
    case "qr-slot": {
      const img = await fabric.FabricImage.fromURL(ctx.qrDataUrl, { crossOrigin: "anonymous" });
      img.set({
        left: obj.left,
        top: obj.top,
        scaleX: obj.size / (img.width ?? obj.size),
        scaleY: obj.size / (img.height ?? obj.size),
        originX: "left",
        originY: "top",
      });
      return img;
    }
    case "svg": {
      // Parse the inline SVG markup into a group so the decoration moves and
      // scales as one unit.
      const result = await fabric.loadSVGFromString(obj.svg);
      const group = fabric.util.groupSVGElements(
        result.objects.filter((o): o is FO => o !== null),
        result.options,
      );
      const naturalW = group.width ?? obj.width;
      const naturalH = group.height ?? obj.height;
      group.set({
        left: obj.left,
        top: obj.top,
        scaleX: obj.width / naturalW,
        scaleY: obj.height / naturalH,
        opacity: obj.opacity ?? 1,
        // groupSVGElements returns a center-origin group; presets place it
        // by its top-left edge, so re-anchor before positioning.
        originX: "left",
        originY: "top",
      });
      return group;
    }
  }
}

/** Clear a canvas and paint a preset onto it. */
export async function paintPreset(
  canvas: import("fabric").StaticCanvas,
  fabric: FabricNs,
  preset: CardPreset,
  ctx: CardContext,
) {
  canvas.clear();
  canvas.backgroundColor = preset.background;
  for (const obj of preset.objects) {
    const built = await buildPresetObject(fabric, obj, ctx);
    if (built) canvas.add(built);
  }
  canvas.renderAll();
}

/**
 * Draw a card off-screen and return it as a PNG data URL. `source` is either
 * a preset or a saved draft's canvas JSON. multiplier 2 gives A4 at ~300 DPI;
 * a small one gives a thumbnail.
 */
export async function renderCardImage(
  source: { preset: CardPreset } | { json: unknown },
  ctx: CardContext,
  multiplier: number,
): Promise<string> {
  await loadBrandFonts();
  const fabric = await loadFabric();
  const el = document.createElement("canvas");
  const canvas = new fabric.StaticCanvas(el, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    enableRetinaScaling: false,
  });
  try {
    if ("preset" in source) {
      await paintPreset(canvas, fabric, source.preset, ctx);
    } else {
      await canvas.loadFromJSON(source.json as Parameters<typeof canvas.loadFromJSON>[0]);
      canvas.renderAll();
    }
    return canvas.toDataURL({ format: "png", multiplier, quality: 1 });
  } finally {
    canvas.dispose();
  }
}

// ── Downloads ────────────────────────────────────────────────────────────────
export function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Wrap a full-resolution PNG into an A4 PDF on the server and download it. */
export async function downloadCardPdf(pngDataUrl: string, filename: string) {
  const res = await fetch("/api/qr-card/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pngDataUrl, filename }),
  });
  if (!res.ok) throw new Error("PDF export failed");
  const url = URL.createObjectURL(await res.blob());
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
