"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CARD_PRESETS,
  type CardPreset,
  type PresetObject,
} from "@/lib/qr-card-editor/presets";

// Fabric.js is heavy + window-only → loaded dynamically inside an effect.
// We keep the module reference at component scope after the first load.
type FabricNs = typeof import("fabric");
type FO = import("fabric").FabricObject;
let fabricModulePromise: Promise<FabricNs> | null = null;
function loadFabric(): Promise<FabricNs> {
  if (!fabricModulePromise) fabricModulePromise = import("fabric");
  return fabricModulePromise;
}

// Load the brand TTFs from /public so canvas text renders with Playfair / Inter
// / JetBrains Mono. We resolve once per browser session.
let fontsReadyPromise: Promise<void> | null = null;
function loadBrandFonts(): Promise<void> {
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

const PRESET_COLORS = [
  "#172033", "#3a4258", "#e27952", "#38584d", "#f0c25c",
  "#fffaf2", "#f2eadf", "#b8431f", "#ffffff", "#000000",
];

const FONT_OPTIONS = ["Playfair Display", "Jost", "Inter", "JetBrains Mono"] as const;

const SNAP_THRESHOLD = 10; // design-px tolerance for centre snapping
const HISTORY_LIMIT = 60;

// ── Draft persistence (localStorage, keyed by event slug) ────────────────────
type DraftShape = { presetId: string; canvas: unknown };
function draftKey(slug: string) {
  return `confetti-qr-draft-${slug}`;
}
function readDraft(slug: string): DraftShape | null {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftShape;
    return parsed?.canvas ? parsed : null;
  } catch {
    return null;
  }
}
function writeDraft(slug: string, draft: DraftShape) {
  try {
    window.localStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    /* quota / private mode — drafts are best-effort */
  }
}
function clearDraft(slug: string) {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    /* ignore */
  }
}

export interface QrCardEditorProps {
  slug: string;
  eventTitle: string;
  eventDate: string | null;
  qrDataUrl: string;
  backHref: string;
}

export function QrCardEditor({
  slug,
  eventTitle,
  eventDate,
  qrDataUrl,
  backHref,
}: QrCardEditorProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<import("fabric").Canvas | null>(null);
  const fabricNsRef = useRef<FabricNs | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [activePresetId, setActivePresetId] = useState<string>(CARD_PRESETS[0].id);
  const activePresetIdRef = useRef<string>(CARD_PRESETS[0].id);
  const [selected, setSelected] = useState<{
    type: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: number | string;
  } | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const [mobileSheet, setMobileSheet] = useState<null | "templates" | "add" | "props">(null);

  // History + guide + autosave scratch state (refs so handlers stay stable).
  const historyRef = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 });
  const suspendHistoryRef = useRef(true); // suspended until the first paint settles
  const guidesRef = useRef<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const saveTimerRef = useRef<number | null>(null);

  function applyPresetId(id: string) {
    activePresetIdRef.current = id;
    setActivePresetId(id);
  }

  // Substitute {{title}}/{{date}} placeholders for the actual event values.
  const fillPlaceholders = useCallback(
    (raw: string) =>
      raw
        .replace(/\{\{title\}\}/g, eventTitle || "Confetti")
        .replace(/\{\{date\}\}/g, eventDate || ""),
    [eventTitle, eventDate],
  );

  // Render a single preset object into a Fabric object instance.
  const buildObject = useCallback(
    async (fabric: FabricNs, obj: PresetObject): Promise<FO | null> => {
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
            selectable: true,
            hasControls: true,
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
            selectable: true,
            hasControls: true,
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
          return new fabric.Textbox(fillPlaceholders(obj.text), {
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
            selectable: true,
            hasControls: true,
          });
        }
        case "qr-slot": {
          const img = await fabric.FabricImage.fromURL(qrDataUrl, { crossOrigin: "anonymous" });
          img.set({
            left: obj.left,
            top: obj.top,
            scaleX: obj.size / (img.width ?? obj.size),
            scaleY: obj.size / (img.height ?? obj.size),
            originX: "left",
            originY: "top",
            selectable: true,
            hasControls: true,
          });
          return img;
        }
        case "svg": {
          // Parse the inline SVG markup into a Fabric group so users can move
          // and scale the decoration as one unit but still drop it like any
          // other object onto the canvas.
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
            selectable: true,
            hasControls: true,
          });
          return group;
        }
      }
    },
    [fillPlaceholders, qrDataUrl],
  );

  const loadPreset = useCallback(
    async (preset: CardPreset) => {
      const canvas = fabricRef.current;
      const fabric = fabricNsRef.current;
      if (!canvas || !fabric) return;

      // Building a preset fires many object:added events — keep them out of the
      // undo history; the caller lays down a single baseline snapshot after.
      suspendHistoryRef.current = true;
      canvas.clear();
      canvas.backgroundColor = preset.background;

      for (const obj of preset.objects) {
        const fabricObj = await buildObject(fabric, obj);
        if (fabricObj) canvas.add(fabricObj);
      }
      canvas.renderAll();
      suspendHistoryRef.current = false;
    },
    [buildObject],
  );

  // ── Autosave + history helpers ─────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      writeDraft(slug, { presetId: activePresetIdRef.current, canvas: canvas.toJSON() });
      setHasDraft(true);
    }, 500);
  }, [slug]);

  const syncHist = useCallback(() => {
    const h = historyRef.current;
    setHist({ canUndo: h.index > 0, canRedo: h.index < h.stack.length - 1 });
  }, []);

  const pushBaseline = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    historyRef.current = { stack: [JSON.stringify(canvas.toJSON())], index: 0 };
    syncHist();
  }, [syncHist]);

  const recordHistory = useCallback(() => {
    if (suspendHistoryRef.current) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const h = historyRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    if (h.stack[h.index] === json) return; // nothing actually changed
    h.stack.push(json);
    if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
    h.index = h.stack.length - 1;
    syncHist();
    scheduleSave();
  }, [syncHist, scheduleSave]);

  const restoreFromJson = useCallback(async (json: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    suspendHistoryRef.current = true;
    await canvas.loadFromJSON(json);
    canvas.requestRenderAll();
    suspendHistoryRef.current = false;
  }, []);

  const undo = useCallback(async () => {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    await restoreFromJson(h.stack[h.index]);
    syncHist();
    scheduleSave();
  }, [restoreFromJson, syncHist, scheduleSave]);

  const redo = useCallback(async () => {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    await restoreFromJson(h.stack[h.index]);
    syncHist();
    scheduleSave();
  }, [restoreFromJson, syncHist, scheduleSave]);

  // ── Centre-snap guides ─────────────────────────────────────────────────────
  const snapObject = useCallback((target: FO) => {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    // getCenterPoint() computes the live centre from the object's current
    // position on every drag tick — unlike getBoundingRect(), whose cached box
    // can lag and made vertical snapping effectively never fire (objects that
    // start horizontally centred masked it as "only horizontal snap works").
    const c = target.getCenterPoint();
    const v: number[] = [];
    const h: number[] = [];
    if (Math.abs(c.x - cx) <= SNAP_THRESHOLD) {
      target.set({ left: (target.left ?? 0) + (cx - c.x) });
      v.push(cx);
    }
    if (Math.abs(c.y - cy) <= SNAP_THRESHOLD) {
      target.set({ top: (target.top ?? 0) + (cy - c.y) });
      h.push(cy);
    }
    target.setCoords();
    guidesRef.current = { v, h };
  }, []);

  const drawGuides = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Draw on the main (lower) context inside after:render: it is cleared and
    // repainted every frame, so guides can never get stuck, and they are never
    // Fabric objects (so they stay out of history + export). With zoom 1 and a
    // 1240px backing store the context transform is identity, so design
    // coordinates map straight to pixels.
    const ctx = (canvas as unknown as { contextContainer?: CanvasRenderingContext2D }).contextContainer;
    if (!ctx) return;
    const { v, h } = guidesRef.current;
    if (!v.length && !h.length) return;
    ctx.save();
    ctx.strokeStyle = "#e27952";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    v.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    });
    h.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    });
    ctx.restore();
  }, []);

  const clearGuides = useCallback(() => {
    if (!guidesRef.current.v.length && !guidesRef.current.h.length) return;
    guidesRef.current = { v: [], h: [] };
    fabricRef.current?.requestRenderAll();
  }, []);

  // ── Mount: load fonts + Fabric, create canvas, restore draft or preset ─────
  useEffect(() => {
    let cancelled = false;
    let canvas: import("fabric").Canvas | null = null;

    (async () => {
      await loadBrandFonts();
      const fabric = await loadFabric();
      if (cancelled || !canvasElRef.current) return;
      fabricNsRef.current = fabric;

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "#fffaf2",
        preserveObjectStacking: true,
        // We supersample manually (full-design-resolution backing store scaled
        // down via CSS in fitToStage), so let Fabric keep the backing store at
        // exactly the size we ask for instead of also multiplying by dpr.
        enableRetinaScaling: false,
      });
      fabricRef.current = canvas;

      const updateSelection = () => {
        const active = canvas?.getActiveObject() as
          | (FO & {
              fontSize?: number;
              fontFamily?: string;
              fontStyle?: string;
              fontWeight?: number | string;
            })
          | undefined;
        if (!active) {
          setSelected(null);
          return;
        }
        setSelected({
          type: active.type ?? "object",
          fill: typeof active.fill === "string" ? active.fill : undefined,
          fontSize: active.fontSize,
          fontFamily: active.fontFamily,
          fontStyle: active.fontStyle,
          fontWeight: active.fontWeight,
        });
      };
      canvas.on("selection:created", updateSelection);
      canvas.on("selection:updated", updateSelection);
      canvas.on("selection:cleared", () => setSelected(null));

      // History triggers — a completed move/resize, or an add/remove.
      canvas.on("object:modified", recordHistory);
      canvas.on("object:added", recordHistory);
      canvas.on("object:removed", recordHistory);

      // Centre snapping + guide overlay.
      canvas.on("object:moving", (e) => {
        const t = (e as { target?: FO | null }).target;
        if (t) snapObject(t);
      });
      canvas.on("mouse:up", clearGuides);
      canvas.on("after:render", drawGuides);

      // ── Display sizing — keep the backing store at full design resolution
      // and only shrink the CSS box to fit the stage. The browser downscales a
      // high-res raster, so text and the QR stay crisp on every DPR.
      const fitToStage = () => {
        if (!canvas || !stageRef.current) return;
        const stage = stageRef.current.getBoundingClientRect();
        const margin = 32;
        const availW = Math.max(160, stage.width - margin);
        const availH = Math.max(160, stage.height - margin);
        const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        let displayH = availH;
        let displayW = displayH * aspect;
        if (displayW > availW) {
          displayW = availW;
          displayH = displayW / aspect;
        }
        canvas.setDimensions({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, { backstoreOnly: true });
        canvas.setDimensions(
          { width: `${Math.round(displayW)}px`, height: `${Math.round(displayH)}px` },
          { cssOnly: true },
        );
        canvas.setZoom(1);
        canvas.requestRenderAll();
      };

      // Restore a saved draft if present, otherwise paint the first preset.
      const draft = readDraft(slug);
      if (draft?.canvas) {
        applyPresetId(draft.presetId ?? CARD_PRESETS[0].id);
        suspendHistoryRef.current = true;
        await canvas.loadFromJSON(draft.canvas as Parameters<typeof canvas.loadFromJSON>[0]);
        suspendHistoryRef.current = false;
        setHasDraft(true);
      } else {
        await loadPreset(CARD_PRESETS[0]);
      }
      fitToStage();
      pushBaseline();

      const ro = new ResizeObserver(fitToStage);
      if (stageRef.current) ro.observe(stageRef.current);
      // Hold the observer on the canvas so the cleanup below can stop it.
      (canvas as unknown as { __ro?: ResizeObserver }).__ro = ro;

      setStatus("ready");
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      (canvas as unknown as { __ro?: ResizeObserver })?.__ro?.disconnect();
      canvas?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts — Delete/Backspace remove, Esc deselect, ⌘/Ctrl+D
  //    duplicate, ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo. Guarded so
  //    keystrokes while editing a textbox pass through. ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject() as (FO & { isEditing?: boolean }) | null;
      if (active?.isEditing) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) void redo();
        else void undo();
      } else if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        void redo();
      } else if (mod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        void duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (active) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key === "Escape") {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ── Toolbar actions ────────────────────────────────────────────────────────
  async function switchPreset(id: string) {
    const preset = CARD_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    applyPresetId(id);
    await loadPreset(preset);
    pushBaseline();
    scheduleSave();
  }

  async function resetToTemplate() {
    const preset = CARD_PRESETS.find((p) => p.id === activePresetIdRef.current) ?? CARD_PRESETS[0];
    await loadPreset(preset);
    pushBaseline();
    clearDraft(slug);
    setHasDraft(false);
  }

  async function addText() {
    const fabric = fabricNsRef.current;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    await loadBrandFonts();
    const tb = new fabric.Textbox("Tvoj tekst", {
      left: CANVAS_WIDTH / 2 - 200,
      top: CANVAS_HEIGHT / 2,
      width: 400,
      originX: "left",
      originY: "top",
      fontFamily: "Inter",
      fontSize: 48,
      fill: "#172033",
      textAlign: "center",
      editable: true,
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    canvas.renderAll();
  }

  async function addImageFromFile(file: File) {
    const fabric = fabricNsRef.current;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await fabric.FabricImage.fromURL(dataUrl);
    const scale = Math.min(CANVAS_WIDTH * 0.7 / (img.width ?? 1), CANVAS_HEIGHT * 0.5 / (img.height ?? 1));
    img.set({
      left: CANVAS_WIDTH / 2 - ((img.width ?? 0) * scale) / 2,
      top: CANVAS_HEIGHT / 2 - ((img.height ?? 0) * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      originX: "left",
      originY: "top",
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
  }

  async function duplicateSelected() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const clone = await active.clone();
    clone.set({ left: (active.left ?? 0) + 40, top: (active.top ?? 0) + 40 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
  }

  function bringForward() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) {
      canvas.bringObjectForward(active);
      canvas.renderAll();
      recordHistory();
    }
  }

  function sendBackward() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) {
      canvas.sendObjectBackwards(active);
      canvas.renderAll();
      recordHistory();
    }
  }

  function setFill(color: string) {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set({ fill: color });
    canvas.renderAll();
    setSelected((prev) => (prev ? { ...prev, fill: color } : prev));
    recordHistory();
  }

  function setFontSize(size: number) {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    (active as { set: (props: Record<string, unknown>) => void }).set({ fontSize: size });
    canvas.renderAll();
    setSelected((prev) => (prev ? { ...prev, fontSize: size } : prev));
  }

  function setFontFamily(family: string) {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    (active as { set: (props: Record<string, unknown>) => void }).set({ fontFamily: family });
    canvas.renderAll();
    setSelected((prev) => (prev ? { ...prev, fontFamily: family } : prev));
    recordHistory();
  }

  function toggleItalic() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const current = (active as { fontStyle?: string }).fontStyle ?? "normal";
    const next = current === "italic" ? "normal" : "italic";
    (active as { set: (props: Record<string, unknown>) => void }).set({ fontStyle: next });
    canvas.renderAll();
    setSelected((prev) => (prev ? { ...prev, fontStyle: next } : prev));
    recordHistory();
  }

  function toggleBold() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const current = (active as { fontWeight?: number | string }).fontWeight ?? "normal";
    const isBold = current === "bold" || Number(current) >= 600;
    const next = isBold ? "normal" : "bold";
    (active as { set: (props: Record<string, unknown>) => void }).set({ fontWeight: next });
    canvas.renderAll();
    setSelected((prev) => (prev ? { ...prev, fontWeight: next } : prev));
    recordHistory();
  }

  // The font-size slider fires continuously; commit one history entry on release.
  function commitFontSize() {
    recordHistory();
  }

  // Render at full design resolution (backing store is already 1240×1754 at
  // zoom 1); neutralise any pan/zoom and let the 2× multiplier give A4 @ ~300
  // DPI (2480×3508) without disturbing the on-screen layout.
  function captureFullResPng(): string | null {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const savedVpt = canvas.viewportTransform ? ([...canvas.viewportTransform] as typeof canvas.viewportTransform) : null;
    try {
      canvas.discardActiveObject();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      return canvas.toDataURL({ format: "png", multiplier: 2, quality: 1 });
    } finally {
      if (savedVpt) canvas.setViewportTransform(savedVpt);
      canvas.requestRenderAll();
    }
  }

  async function exportPng() {
    setBusy("png");
    try {
      const dataUrl = captureFullResPng();
      if (dataUrl) triggerDownload(dataUrl, `confetti-${slug}-card.png`);
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      const dataUrl = captureFullResPng();
      if (!dataUrl) return;
      const res = await fetch("/api/qr-card/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pngDataUrl: dataUrl, filename: `confetti-${slug}-card.pdf` }),
      });
      if (!res.ok) throw new Error("PDF export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `confetti-${slug}-card.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(null);
    }
  }

  // ── Reusable panel bodies (shared by desktop rails + mobile sheets) ─────────
  const templatesBody = (
    <>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Start from template
      </p>
      <div className="space-y-2">
        {CARD_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => void switchPreset(p.id)}
            className={`block w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
              activePresetId === p.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-white"
                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      {hasDraft && (
        <button
          onClick={() => void resetToTemplate()}
          className="mt-3 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-white/70 transition hover:bg-white/10"
        >
          ↺ Reset to template
        </button>
      )}
    </>
  );

  const addBody = (
    <>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Add</p>
      <div className="space-y-2">
        <button
          onClick={addText}
          className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/85 transition hover:bg-white/10"
        >
          + Text
        </button>
        <label className="block w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/85 transition hover:bg-white/10">
          + Image (upload)
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void addImageFromFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Tip</p>
      <p className="text-xs leading-5 text-white/55">
        Double-click text to edit. Drag to move — objects snap to the centre.
        Shortcuts: <span className="text-white/70">Del</span> removes,{" "}
        <span className="text-white/70">Esc</span> deselects,{" "}
        <span className="text-white/70">⌘/Ctrl+Z</span> undo,{" "}
        <span className="text-white/70">⌘/Ctrl+D</span> duplicate.
      </p>
    </>
  );

  const propsBody = !selected ? (
    <p className="text-xs leading-5 text-white/45">Click an object on the canvas to see its properties here.</p>
  ) : (
    <div className="space-y-4">
      <p className="text-xs text-white/55">
        {selected.type === "textbox" ? "Text" : selected.type === "image" ? "Image" : "Shape"}
      </p>

      {selected.fill !== undefined && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setFill(c)}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  selected.fill === c ? "border-white" : "border-white/20 hover:border-white/50"
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <input
            type="color"
            value={selected.fill}
            onChange={(e) => setFill(e.target.value)}
            className="mt-2 h-8 w-full cursor-pointer rounded border border-white/15 bg-transparent"
          />
        </div>
      )}

      {selected.fontFamily !== undefined && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Font</p>
          <select
            value={selected.fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white/90 focus:border-white/40 focus:outline-none"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f} className="bg-[#161b22]">
                {f}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button
              onClick={toggleBold}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-bold transition ${
                selected.fontWeight === "bold" || Number(selected.fontWeight) >= 600
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              B
            </button>
            <button
              onClick={toggleItalic}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs italic transition ${
                selected.fontStyle === "italic"
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              I
            </button>
          </div>
        </div>
      )}

      {selected.fontSize !== undefined && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Size · {selected.fontSize}
          </p>
          <input
            type="range"
            min={12}
            max={200}
            value={selected.fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            onPointerUp={commitFontSize}
            onKeyUp={commitFontSize}
            className="w-full"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={bringForward}
          className="flex-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ↑ Forward
        </button>
        <button
          onClick={sendBackward}
          className="flex-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ↓ Back
        </button>
      </div>

      <button
        onClick={() => void duplicateSelected()}
        className="block w-full rounded-md border border-white/15 bg-white/5 px-2 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
      >
        Duplicate
      </button>

      <button
        onClick={deleteSelected}
        className="block w-full rounded-md border border-red-400/30 bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
      >
        Delete
      </button>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-[#0f1419]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#161b22] px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:px-4"
          >
            ←<span className="hidden sm:inline"> Back</span>
          </Link>
          <div className="hidden min-w-0 truncate text-sm text-white/70 md:block">
            <span className="text-white/40">QR Card editor · </span>
            <span className="font-semibold text-white">{eventTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Undo / redo */}
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
            <button
              onClick={() => void undo()}
              disabled={!hist.canUndo}
              title="Undo (⌘/Ctrl+Z)"
              aria-label="Undo"
              className="rounded-full px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↶
            </button>
            <button
              onClick={() => void redo()}
              disabled={!hist.canRedo}
              title="Redo (⌘/Ctrl+Shift+Z)"
              aria-label="Redo"
              className="rounded-full px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↷
            </button>
          </div>

          <button
            onClick={exportPng}
            disabled={busy !== null || status !== "ready"}
            className="rounded-full bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            {busy === "png" ? "…" : (<><span className="sm:hidden">PNG</span><span className="hidden sm:inline">Download PNG</span></>)}
          </button>
          <button
            onClick={exportPdf}
            disabled={busy !== null || status !== "ready"}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            {busy === "pdf" ? "…" : (<><span className="sm:hidden">PDF</span><span className="hidden sm:inline">Download PDF</span></>)}
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Left rail (desktop) */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-[#161b22] p-4 lg:block">
          {templatesBody}
          <div className="mt-6">{addBody}</div>
        </aside>

        {/* Canvas viewport — `stageRef` is measured by the ResizeObserver so
            the canvas always scales to fit without overflowing. */}
        <main
          ref={stageRef}
          className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#0f1419] p-4"
        >
          {status === "loading" && (
            <p className="absolute z-10 text-sm text-white/60">Loading editor…</p>
          )}
          <div className="shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <canvas ref={canvasElRef} />
          </div>
        </main>

        {/* Right rail (desktop) */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-white/10 bg-[#161b22] p-4 lg:block">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Selected</p>
          {propsBody}
        </aside>

        {/* Mobile sheet overlay */}
        {mobileSheet && (
          <div
            className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40 lg:hidden"
            onClick={() => setMobileSheet(null)}
          >
            <div
              className="max-h-[72%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#161b22] p-4 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              {mobileSheet === "templates" && templatesBody}
              {mobileSheet === "add" && addBody}
              {mobileSheet === "props" && (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Selected</p>
                  {propsBody}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom toolbar */}
      <nav className="flex shrink-0 items-center justify-around border-t border-white/10 bg-[#161b22] px-2 py-2 lg:hidden">
        <MobileTab label="Templates" active={mobileSheet === "templates"} onClick={() => setMobileSheet(mobileSheet === "templates" ? null : "templates")} />
        <MobileTab label="Add" active={mobileSheet === "add"} onClick={() => setMobileSheet(mobileSheet === "add" ? null : "add")} />
        <MobileTab
          label="Edit"
          active={mobileSheet === "props"}
          disabled={!selected}
          onClick={() => setMobileSheet(mobileSheet === "props" ? null : "props")}
        />
      </nav>
    </div>
  );
}

function MobileTab({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[var(--color-accent)]/15 text-white"
          : "text-white/70 hover:bg-white/5 disabled:opacity-30"
      }`}
    >
      {label}
    </button>
  );
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
