"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { Dict } from "@/lib/i18n/index";
import { CANVAS_HEIGHT, CANVAS_WIDTH, CARD_PRESETS, type CardPreset } from "@/lib/qr-card-editor/presets";
import {
  buildPresetObject,
  clearDraft,
  downloadCardPdf,
  loadBrandFonts,
  loadFabric,
  readDraft,
  renderCardImage,
  triggerDownload,
  writeDraft,
  type CardContext,
  type FabricNs,
  type FO,
} from "@/lib/qr-card-editor/render";

const PRESET_COLORS = [
  "#172033", "#3a4258", "#e27952", "#38584d", "#f0c25c",
  "#fffaf2", "#f2eadf", "#b8431f", "#ffffff", "#000000",
];

const FONT_OPTIONS = ["Playfair Display", "Jost", "Inter", "JetBrains Mono"] as const;

const SNAP_THRESHOLD = 10; // design-px tolerance for centre snapping
const HISTORY_LIMIT = 60;
// A snapshot is the whole canvas serialized, and any image the user uploads
// lives inside it as a base64 data URL. Sixty snapshots taken after a 3 MB
// photo upload would retain hundreds of MB, so bound the stack by bytes too.
const HISTORY_MAX_BYTES = 24_000_000;

type Strings = Dict["dashboard"]["qrCard"]["editor"];

type Selected = {
  type: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: number | string;
  text?: string;
  textAlign?: string;
};

/** One tool at a time on a phone, in a strip under the card — never over it. */
type Tool = "templates" | "shapes" | "text" | "color" | "font" | "size" | "align" | "layer";

export interface QrCardEditorProps {
  slug: string;
  eventTitle: string;
  eventDate: string | null;
  qrDataUrl: string;
  backHref: string;
  strings: Strings;
  /** Open with this template instead of the saved draft (chosen on the QR page). */
  initialTemplateId?: string;
}

function isTextbox(selected: Selected | null) {
  return selected?.type === "textbox";
}

export function QrCardEditor({
  slug,
  eventTitle,
  eventDate,
  qrDataUrl,
  backHref,
  strings: s,
  initialTemplateId,
}: QrCardEditorProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<import("fabric").Canvas | null>(null);
  const fabricNsRef = useRef<FabricNs | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [activePresetId, setActivePresetId] = useState<string>(CARD_PRESETS[0].id);
  const activePresetIdRef = useRef<string>(CARD_PRESETS[0].id);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [exportError, setExportError] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const [tool, setTool] = useState<Tool | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // History + guide + autosave scratch state (refs so handlers stay stable).
  const historyRef = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 });
  const suspendHistoryRef = useRef(true); // suspended until the first paint settles
  const guidesRef = useRef<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const saveTimerRef = useRef<number | null>(null);
  const textCommitTimerRef = useRef<number | null>(null);
  // CSS px per design px. The backing store is the full 1240×1754 design, shown
  // shrunk, so anything Fabric draws in design px — handles included — shrinks
  // with it. On a phone that made the handles about 3 px wide.
  const displayScaleRef = useRef(1);

  // The event's name, date and QR code; fixed for the life of the editor.
  const ctxRef = useRef<CardContext>({ title: eventTitle, date: eventDate, qrDataUrl });

  function applyPresetId(id: string) {
    activePresetIdRef.current = id;
    setActivePresetId(id);
  }

  // ── Handles sized for the screen, not the print ────────────────────────────
  const styleControls = useCallback((obj: FO) => {
    const scale = displayScaleRef.current || 1;
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    obj.set({
      cornerSize: (coarse ? 15 : 11) / scale,
      touchCornerSize: 44 / scale,
      padding: (coarse ? 8 : 4) / scale,
      borderScaleFactor: 1.5 / scale,
      transparentCorners: false,
      cornerStyle: "circle",
      cornerColor: "#ffffff",
      cornerStrokeColor: "#e27952",
      borderColor: "#e27952",
    });
    const rotate = (obj as unknown as { controls?: Record<string, { offsetY?: number }> }).controls?.mtr;
    if (rotate) rotate.offsetY = -(coarse ? 36 : 28) / scale;
    // On a phone, text is changed in the text tool; tapping into the canvas
    // text would pop the keyboard and shove the whole layout around.
    if (obj.type === "textbox") (obj as unknown as { editable: boolean }).editable = !coarse;
  }, []);

  const styleAll = useCallback(() => {
    fabricRef.current?.getObjects().forEach(styleControls);
    fabricRef.current?.requestRenderAll();
  }, [styleControls]);

  const loadPreset = useCallback(async (preset: CardPreset) => {
    const canvas = fabricRef.current;
    const fabric = fabricNsRef.current;
    if (!canvas || !fabric) return;

    // Building a preset fires many object:added events — keep them out of the
    // undo history; the caller lays down a single baseline snapshot after.
    suspendHistoryRef.current = true;
    canvas.clear();
    canvas.backgroundColor = preset.background;
    for (const obj of preset.objects) {
      const built = await buildPresetObject(fabric, obj, ctxRef.current);
      if (built) canvas.add(built);
    }
    canvas.renderAll();
    suspendHistoryRef.current = false;
  }, []);

  // ── Autosave + history helpers ─────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const saved = writeDraft(slug, { presetId: activePresetIdRef.current, canvas: canvas.toJSON() });
      // Only claim a draft exists when one really does. A failed save leaves
      // any previously stored draft intact, so never flip this back to false.
      if (saved) setHasDraft(true);
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
    // Trim by count *and* by total bytes — see HISTORY_MAX_BYTES.
    let bytes = h.stack.reduce((sum, entry) => sum + entry.length, 0);
    while (h.stack.length > 1 && (h.stack.length > HISTORY_LIMIT || bytes > HISTORY_MAX_BYTES)) {
      bytes -= h.stack[0].length;
      h.stack.shift();
    }
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
    // getCenterPoint() computes the live centre on every drag tick — unlike
    // getBoundingRect(), whose cached box can lag.
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
    // Drawn on the main context inside after:render, so guides are repainted
    // every frame, never stick, and never become objects (history, export).
    const context = (canvas as unknown as { contextContainer?: CanvasRenderingContext2D }).contextContainer;
    if (!context) return;
    const { v, h } = guidesRef.current;
    if (!v.length && !h.length) return;
    const scale = displayScaleRef.current || 1;
    context.save();
    context.strokeStyle = "#e27952";
    context.lineWidth = 1.5 / scale;
    context.setLineDash([7 / scale, 5 / scale]);
    v.forEach((x) => {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, CANVAS_HEIGHT);
      context.stroke();
    });
    h.forEach((y) => {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(CANVAS_WIDTH, y);
      context.stroke();
    });
    context.restore();
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
        // down via CSS in fitToStage), so keep the backing store at exactly
        // the size we ask for instead of also multiplying by dpr.
        enableRetinaScaling: false,
        // A finger on the card should drag the object, not scroll the page.
        allowTouchScrolling: false,
      });
      fabricRef.current = canvas;

      const updateSelection = () => {
        const active = canvas?.getActiveObject() as (FO & Selected) | undefined;
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
          text: (active as { text?: string }).text,
          textAlign: (active as { textAlign?: string }).textAlign,
        });
      };
      canvas.on("selection:created", updateSelection);
      canvas.on("selection:updated", updateSelection);
      canvas.on("selection:cleared", () => setSelected(null));

      // History triggers — a completed move/resize, or an add/remove. Every
      // added object (preset, undo, draft) also gets screen-sized handles.
      canvas.on("object:added", (e) => {
        const t = (e as { target?: FO }).target;
        if (t) styleControls(t);
        recordHistory();
      });
      canvas.on("object:modified", recordHistory);
      canvas.on("object:removed", recordHistory);

      // Centre snapping + guide overlay.
      canvas.on("object:moving", (e) => {
        const t = (e as { target?: FO | null }).target;
        if (t) snapObject(t);
      });
      canvas.on("mouse:up", clearGuides);
      canvas.on("after:render", drawGuides);

      // Keep the backing store at full design resolution and only shrink the
      // CSS box to fit the stage, so text and the QR stay crisp on every DPR.
      const fitToStage = () => {
        if (!canvas || !stageRef.current) return;
        const stage = stageRef.current.getBoundingClientRect();
        const margin = stage.width < 640 ? 20 : 40;
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
        displayScaleRef.current = displayW / CANVAS_WIDTH;
        styleAll();
      };

      // A template chosen on the QR page wins; then a saved draft; then the first preset.
      const chosen = CARD_PRESETS.find((p) => p.id === initialTemplateId);
      const draft = chosen ? null : readDraft(slug);
      if (chosen) {
        applyPresetId(chosen.id);
        await loadPreset(chosen);
      } else if (draft?.canvas) {
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
      if (chosen) scheduleSave();

      const ro = new ResizeObserver(fitToStage);
      if (stageRef.current) ro.observe(stageRef.current);
      (canvas as unknown as { __ro?: ResizeObserver }).__ro = ro;

      setStatus("ready");

      // Template thumbnails, one at a time after the editor is usable.
      for (const preset of CARD_PRESETS) {
        if (cancelled) return;
        try {
          const url = await renderCardImage({ preset }, ctxRef.current, 0.16);
          if (!cancelled) setThumbs((current) => ({ ...current, [preset.id]: url }));
        } catch {
          // A missing thumbnail leaves the name; the template still works.
        }
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (textCommitTimerRef.current) window.clearTimeout(textCommitTimerRef.current);
      (canvas as unknown as { __ro?: ResizeObserver })?.__ro?.disconnect();
      canvas?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A property tool with nothing selected has nothing to act on.
  useEffect(() => {
    if (!selected && tool && tool !== "templates" && tool !== "shapes") setTool(null);
  }, [selected, tool]);

  // ── Keyboard shortcuts — Delete/Backspace remove, Esc deselect, ⌘/Ctrl+D
  //    duplicate, ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo. Guarded so
  //    keystrokes while editing text pass through. ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject() as (FO & { isEditing?: boolean }) | null;
      if (active?.isEditing) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT")) return;

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

  // ── Actions ─────────────────────────────────────────────────────────────────
  function activeObject() {
    return fabricRef.current?.getActiveObject() as (FO & { set: (p: Record<string, unknown>) => void }) | undefined;
  }

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
    const tb = new fabric.Textbox(s.newText, {
      left: CANVAS_WIDTH / 2 - 300,
      top: CANVAS_HEIGHT / 2 - 40,
      width: 600,
      originX: "left",
      originY: "top",
      fontFamily: "Inter",
      fontSize: 64,
      fill: "#172033",
      textAlign: "center",
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    canvas.renderAll();
    setTool("text");
  }

  /**
   * Shape primitives. A line is a thin Rect rather than fabric.Line — it keeps
   * a sane bounding box when dragged/resized and matches how the presets
   * already build their rules.
   */
  function addShape(kind: "rect" | "circle" | "line") {
    const fabric = fabricNsRef.current;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;

    const common = { fill: "#172033", originX: "left" as const, originY: "top" as const };
    let shape: import("fabric").FabricObject;
    if (kind === "circle") {
      const radius = 140;
      shape = new fabric.Circle({ ...common, radius, left: CANVAS_WIDTH / 2 - radius, top: CANVAS_HEIGHT / 2 - radius });
    } else if (kind === "line") {
      const width = 480;
      const height = 6;
      shape = new fabric.Rect({
        ...common,
        width,
        height,
        left: CANVAS_WIDTH / 2 - width / 2,
        top: CANVAS_HEIGHT / 2 - height / 2,
        strokeWidth: 0,
      });
    } else {
      const width = 400;
      const height = 260;
      shape = new fabric.Rect({
        ...common,
        width,
        height,
        rx: 12,
        ry: 12,
        left: CANVAS_WIDTH / 2 - width / 2,
        top: CANVAS_HEIGHT / 2 - height / 2,
        strokeWidth: 0,
      });
    }
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
    setTool("color");
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
    const scale = Math.min((CANVAS_WIDTH * 0.7) / (img.width ?? 1), (CANVAS_HEIGHT * 0.5) / (img.height ?? 1));
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
    setTool(null);
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

  function deselect() {
    recordHistory(); // no-op unless a live edit (text, size) is still uncommitted
    const canvas = fabricRef.current;
    canvas?.discardActiveObject();
    canvas?.requestRenderAll();
    setTool(null);
  }

  function centerHorizontally() {
    const canvas = fabricRef.current;
    const active = activeObject();
    if (!canvas || !active) return;
    const c = active.getCenterPoint();
    active.set({ left: (active.left ?? 0) + (CANVAS_WIDTH / 2 - c.x) });
    active.setCoords();
    canvas.requestRenderAll();
    recordHistory();
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

  /** Set one property on the selection; `commit` false while a slider or field is still moving. */
  function setProp(props: Record<string, unknown>, patch: Partial<Selected>, commit = true) {
    const canvas = fabricRef.current;
    const active = activeObject();
    if (!canvas || !active) return;
    active.set(props);
    active.setCoords();
    canvas.requestRenderAll();
    setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
    if (commit) recordHistory();
  }

  function toggleItalic() {
    const next = selected?.fontStyle === "italic" ? "normal" : "italic";
    setProp({ fontStyle: next }, { fontStyle: next });
  }

  function toggleBold() {
    const current = selected?.fontWeight ?? "normal";
    const isBold = current === "bold" || Number(current) >= 600;
    const next = isBold ? "normal" : "bold";
    setProp({ fontWeight: next }, { fontWeight: next });
  }

  // Render at full design resolution with any pan/zoom neutralised; the 2×
  // multiplier gives A4 at ~300 DPI (2480×3508).
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

  async function exportAs(kind: "png" | "pdf") {
    setDownloadOpen(false);
    setExportError(false);
    setBusy(kind);
    try {
      const dataUrl = captureFullResPng();
      if (!dataUrl) return;
      if (kind === "png") triggerDownload(dataUrl, `confetti-${slug}-kartica.png`);
      else await downloadCardPdf(dataUrl, `confetti-${slug}-kartica.pdf`);
    } catch {
      setExportError(true);
    } finally {
      setBusy(null);
    }
  }

  // ── Panel bodies (shared by desktop rails and the phone tool strip) ─────────
  const sectionLabel = (text: string) => (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{text}</p>
  );

  const templatesBody = (compact: boolean) => (
    <div>
      <div className={compact ? "flex gap-2 overflow-x-auto pb-1" : "grid grid-cols-2 gap-2"}>
        {CARD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void switchPreset(p.id)}
            className={`shrink-0 overflow-hidden rounded-lg border text-left transition ${
              compact ? "w-[92px]" : ""
            } ${
              activePresetId === p.id
                ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/40"
                : "border-white/10 hover:border-white/30"
            }`}
          >
            <span className="block aspect-[1240/1754] w-full bg-white/5">
              {thumbs[p.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[p.id]} alt="" className="h-full w-full object-cover" />
              ) : null}
            </span>
            <span className="block truncate px-1.5 py-1 text-[10px] font-medium text-white/75">{p.name}</span>
          </button>
        ))}
      </div>
      {hasDraft ? (
        <button
          type="button"
          onClick={() => void resetToTemplate()}
          className="mt-3 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-white/70 transition hover:bg-white/10"
        >
          ↺ {s.resetTemplate}
        </button>
      ) : null}
    </div>
  );

  const shapesBody = (
    <div className="grid grid-cols-3 gap-2">
      {([
        { kind: "rect", label: s.rect, icon: <rect x="3.5" y="5" width="17" height="14" rx="2.5" /> },
        { kind: "circle", label: s.circle, icon: <circle cx="12" cy="12" r="7.5" /> },
        { kind: "line", label: s.line, icon: <path d="M4 12h16" /> },
      ] as const).map((shape) => (
        <button
          key={shape.kind}
          type="button"
          onClick={() => addShape(shape.kind)}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-3 text-[11px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            {shape.icon}
          </svg>
          {shape.label}
        </button>
      ))}
    </div>
  );

  const textBody = (
    <textarea
      value={selected?.text ?? ""}
      rows={2}
      onChange={(e) => {
        setProp({ text: e.target.value }, { text: e.target.value }, false);
        // Typing is one undo step, and reaches the draft even if the field never loses focus.
        if (textCommitTimerRef.current) window.clearTimeout(textCommitTimerRef.current);
        textCommitTimerRef.current = window.setTimeout(() => recordHistory(), 600);
      }}
      onBlur={() => recordHistory()}
      className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-white focus:border-white/40 focus:outline-none"
    />
  );

  const colorBody = (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setProp({ fill: c }, { fill: c })}
            aria-label={c}
            className={`h-9 w-9 rounded-full border-2 transition ${
              selected?.fill === c ? "border-white" : "border-white/20 hover:border-white/50"
            }`}
            style={{ background: c }}
          />
        ))}
        <label
          className="relative flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3 text-xs font-medium text-white/75"
          title={s.customColor}
        >
          <span className="h-4 w-4 rounded-full border border-white/30" style={{ background: selected?.fill ?? "#000" }} />
          {s.customColor}
          <input
            type="color"
            value={selected?.fill && selected.fill.startsWith("#") ? selected.fill : "#000000"}
            onChange={(e) => setProp({ fill: e.target.value }, { fill: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );

  const toggleClass = (on: boolean) =>
    `flex-1 rounded-lg border px-2 py-2 text-sm transition ${
      on ? "border-white/40 bg-white/15 text-white" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
    }`;

  const fontBody = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setProp({ fontFamily: f }, { fontFamily: f })}
            style={{ fontFamily: f }}
            className={toggleClass(selected?.fontFamily === f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleBold}
          title={s.bold}
          aria-label={s.bold}
          className={`${toggleClass(selected?.fontWeight === "bold" || Number(selected?.fontWeight) >= 600)} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          title={s.italic}
          aria-label={s.italic}
          className={`${toggleClass(selected?.fontStyle === "italic")} font-serif italic`}
        >
          I
        </button>
      </div>
    </div>
  );

  const sizeBody = (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={12}
        max={220}
        value={Math.round(selected?.fontSize ?? 48)}
        onChange={(e) => setProp({ fontSize: Number(e.target.value) }, { fontSize: Number(e.target.value) }, false)}
        onPointerUp={() => recordHistory()}
        onKeyUp={() => recordHistory()}
        className="h-8 flex-1 accent-[var(--color-accent)]"
      />
      <span className="w-10 text-right text-sm font-semibold tabular-nums text-white/85">
        {Math.round(selected?.fontSize ?? 0)}
      </span>
    </div>
  );

  const alignBody = (
    <div className="flex gap-2">
      {([
        ["left", s.alignLeft],
        ["center", s.alignCenter],
        ["right", s.alignRight],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setProp({ textAlign: value }, { textAlign: value })}
          className={toggleClass(selected?.textAlign === value)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const layerBody = (
    <div className="flex gap-2">
      <button type="button" onClick={bringForward} className={toggleClass(false)}>
        ↑ {s.forward}
      </button>
      <button type="button" onClick={sendBackward} className={toggleClass(false)}>
        ↓ {s.backward}
      </button>
    </div>
  );

  const typeLabel = !selected
    ? ""
    : selected.type === "textbox"
      ? s.textType
      : selected.type === "image"
        ? s.imageType
        : s.shapeType;

  // Desktop right rail: every property of the selection, stacked.
  const propsRail = !selected ? (
    <p className="text-xs leading-5 text-white/45">{s.selectHint}</p>
  ) : (
    <div className="space-y-5">
      <p className="text-xs text-white/55">{typeLabel}</p>
      {isTextbox(selected) ? (
        <div>
          {sectionLabel(s.editText)}
          {textBody}
        </div>
      ) : null}
      {selected.fill !== undefined ? (
        <div>
          {sectionLabel(s.color)}
          {colorBody}
        </div>
      ) : null}
      {isTextbox(selected) ? (
        <>
          <div>
            {sectionLabel(s.font)}
            {fontBody}
          </div>
          <div>
            {sectionLabel(s.size)}
            {sizeBody}
          </div>
          <div>
            {sectionLabel(s.align)}
            {alignBody}
          </div>
        </>
      ) : null}
      <div>
        {sectionLabel(s.layer)}
        {layerBody}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={centerHorizontally} className={toggleClass(false)}>
          {s.center}
        </button>
        <button type="button" onClick={() => void duplicateSelected()} className={toggleClass(false)}>
          {s.duplicate}
        </button>
      </div>
      <button
        type="button"
        onClick={deleteSelected}
        className="block w-full rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
      >
        {s.delete}
      </button>
    </div>
  );

  // Phone: the open tool's panel, shown between the card and the tool strip.
  const toolPanel: Record<Tool, { title: string; body: ReactNode }> = {
    templates: { title: s.templates, body: templatesBody(true) },
    shapes: { title: s.shapes, body: shapesBody },
    text: { title: s.editText, body: textBody },
    color: { title: s.color, body: colorBody },
    font: { title: s.font, body: fontBody },
    size: { title: s.size, body: sizeBody },
    align: { title: s.align, body: alignBody },
    layer: { title: s.layer, body: layerBody },
  };

  const toggleTool = (next: Tool) => setTool((current) => (current === next ? null : next));

  const phoneTools: { key: string; label: string; icon: ReactNode; onClick: () => void; active?: boolean; danger?: boolean }[] =
    selected
      ? [
          ...(isTextbox(selected)
            ? [{ key: "text", label: s.editText, icon: <path d="M5 6h14M12 6v13M9 19h6" />, onClick: () => toggleTool("text"), active: tool === "text" }]
            : []),
          ...(selected.fill !== undefined
            ? [{ key: "color", label: s.color, icon: <circle cx="12" cy="12" r="7" />, onClick: () => toggleTool("color"), active: tool === "color" }]
            : []),
          ...(isTextbox(selected)
            ? [
                { key: "font", label: s.font, icon: <path d="M6 19l6-14 6 14M8.5 13h7" />, onClick: () => toggleTool("font"), active: tool === "font" },
                { key: "size", label: s.size, icon: <path d="M4 18h16M7 14l5-9 5 9" />, onClick: () => toggleTool("size"), active: tool === "size" },
                { key: "align", label: s.align, icon: <path d="M5 7h14M8 12h8M5 17h14" />, onClick: () => toggleTool("align"), active: tool === "align" },
              ]
            : []),
          { key: "layer", label: s.layer, icon: <path d="M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4" />, onClick: () => toggleTool("layer"), active: tool === "layer" },
          { key: "center", label: s.center, icon: <path d="M12 3v18M7 8h10v8H7z" />, onClick: centerHorizontally },
          { key: "dup", label: s.duplicate, icon: <path d="M8 8h11v11H8zM5 16V5h11" />, onClick: () => void duplicateSelected() },
          { key: "del", label: s.delete, icon: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />, onClick: deleteSelected, danger: true },
          { key: "done", label: s.done, icon: <path d="M5 12.5l4.5 4.5L19 7.5" />, onClick: deselect },
        ]
      : [
          { key: "templates", label: s.templates, icon: <path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" />, onClick: () => toggleTool("templates"), active: tool === "templates" },
          { key: "text", label: s.text, icon: <path d="M5 6h14M12 6v13M9 19h6" />, onClick: () => void addText() },
          { key: "image", label: s.image, icon: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 16l5-5 4 4 3-3 5 5" /></>, onClick: () => imageInputRef.current?.click() },
          { key: "shapes", label: s.shapes, icon: <><rect x="4" y="4" width="8" height="8" rx="1.5" /><circle cx="16" cy="16" r="4" /></>, onClick: () => toggleTool("shapes"), active: tool === "shapes" },
        ];

  const headerButton =
    "rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex h-dvh flex-col bg-[#0f1419] text-white">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void addImageFromFile(f);
          e.target.value = "";
        }}
      />

      {/* Top bar */}
      <header className="relative z-40 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#161b22] px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} className={headerButton} aria-label={s.back}>
            ←<span className="hidden sm:inline"> {s.back}</span>
          </Link>
          <div className="hidden min-w-0 truncate text-sm text-white/70 md:block">
            <span className="text-white/40">{s.title} · </span>
            <span className="font-semibold text-white">{eventTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => void undo()} disabled={!hist.canUndo} title={s.undo} aria-label={s.undo} className={headerButton}>
            ↶
          </button>
          <button type="button" onClick={() => void redo()} disabled={!hist.canRedo} title={s.redo} aria-label={s.redo} className={headerButton}>
            ↷
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDownloadOpen((open) => !open)}
              disabled={busy !== null || status !== "ready"}
              aria-expanded={downloadOpen}
              className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? s.preparing : `${s.download} ↓`}
            </button>
            {downloadOpen ? (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#1c222b] shadow-2xl">
                <button type="button" onClick={() => void exportAs("pdf")} className="block w-full px-4 py-3 text-left text-sm font-semibold hover:bg-white/10">
                  {s.downloadPdf}
                </button>
                <button type="button" onClick={() => void exportAs("png")} className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm font-semibold hover:bg-white/10">
                  {s.downloadPng}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {exportError ? (
        <p role="alert" className="shrink-0 bg-red-500/15 px-4 py-2 text-center text-sm text-red-200">
          {s.exportFailed}
        </p>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        {/* Left rail (desktop) */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-[#161b22] p-4 lg:block">
          {sectionLabel(s.templates)}
          {templatesBody(false)}
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => void addText()}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              + {s.text}
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              + {s.image}
            </button>
            <div className="pt-1">{shapesBody}</div>
          </div>
          <p className="mt-6 text-xs leading-5 text-white/50">{s.desktopTip}</p>
        </aside>

        {/* Canvas stage — measured by the ResizeObserver so the card always
            fits, including when a phone tool panel opens below it. */}
        <main
          ref={stageRef}
          onClick={() => setDownloadOpen(false)}
          className="relative flex min-h-0 min-w-0 flex-1 touch-none items-center justify-center overflow-hidden bg-[#0f1419]"
        >
          {status === "loading" ? <p className="absolute z-10 text-sm text-white/60">{s.loading}</p> : null}
          <div className="shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <canvas ref={canvasElRef} />
          </div>
        </main>

        {/* Right rail (desktop) */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[#161b22] p-4 lg:block">
          {sectionLabel(s.selected)}
          {propsRail}
        </aside>
      </div>

      {/* Phone: the open tool, in the flow so the card shrinks instead of being covered */}
      {tool ? (
        <section className="max-h-[38dvh] shrink-0 overflow-y-auto border-t border-white/10 bg-[#161b22] px-4 pb-3 pt-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{toolPanel[tool].title}</p>
            <button type="button" onClick={() => setTool(null)} className="rounded-full px-2 py-1 text-xs font-semibold text-white/60">
              ✕
            </button>
          </div>
          {toolPanel[tool].body}
        </section>
      ) : !selected ? (
        <p className="shrink-0 bg-[#161b22] px-4 pt-2 text-center text-xs text-white/45 lg:hidden">{s.selectHint}</p>
      ) : null}

      {/* Phone: tool strip */}
      <nav className="shrink-0 border-t border-white/10 bg-[#161b22] pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 lg:hidden">
        <div className="flex gap-1 overflow-x-auto px-2 [scrollbar-width:none]">
          {phoneTools.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={`flex min-w-[76px] flex-1 flex-col items-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                item.active
                  ? "bg-[var(--color-accent)]/20 text-white"
                  : item.danger
                    ? "text-red-300"
                    : "text-white/75 active:bg-white/10"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {item.icon}
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
