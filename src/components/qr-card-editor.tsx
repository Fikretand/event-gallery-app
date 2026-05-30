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
    ["Playfair Display", "/fonts/poster/playfair-italic-latin.ttf", { style: "italic", weight: "600" }],
    ["Playfair Display", "/fonts/poster/playfair-italic-ext.ttf", { style: "italic", weight: "600" }],
    ["Playfair Display", "/fonts/poster/playfair-bold-latin.ttf", { style: "normal", weight: "700" }],
    ["Playfair Display", "/fonts/poster/playfair-bold-ext.ttf", { style: "normal", weight: "700" }],
    ["Inter", "/fonts/poster/inter-latin.ttf", { style: "normal", weight: "500" }],
    ["Inter", "/fonts/poster/inter-ext.ttf", { style: "normal", weight: "500" }],
    ["JetBrains Mono", "/fonts/poster/jetbrains-mono-latin.ttf", { style: "normal", weight: "500" }],
    ["JetBrains Mono", "/fonts/poster/jetbrains-mono-ext.ttf", { style: "normal", weight: "500" }],
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

const FONT_OPTIONS = ["Playfair Display", "Inter", "JetBrains Mono"] as const;

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
  const [selected, setSelected] = useState<{
    type: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: number | string;
  } | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

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
    async (fabric: FabricNs, obj: PresetObject): Promise<import("fabric").FabricObject | null> => {
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
            selectable: true,
            hasControls: true,
          });
        case "text": {
          // Fabric Textbox auto-resizes its bounding box to the natural text
          // width — so `textAlign: center` inside an originX='left' box at
          // left=0 ends up rendering the text at canvas x=0 instead of the
          // visual centre. Anchor the box explicitly via originX/originY so
          // the centred text lands where the preset intends.
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
            selectable: true,
            hasControls: true,
          });
          return img;
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

      canvas.clear();
      canvas.backgroundColor = preset.background;

      for (const obj of preset.objects) {
        const fabricObj = await buildObject(fabric, obj);
        if (fabricObj) canvas.add(fabricObj);
      }
      canvas.renderAll();
    },
    [buildObject],
  );

  // ── Mount: load fonts + Fabric, create canvas, paint first preset ──────────
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
      });
      fabricRef.current = canvas;

      const updateSelection = () => {
        const active = canvas?.getActiveObject() as
          | (import("fabric").FabricObject & {
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

      // ── Display sizing — design coordinates stay in 1240×1754 space; we
      // shrink the canvas buffer to fit the stage and use setZoom so objects
      // render at the right scale. Recompute on resize.
      const fitToStage = () => {
        if (!canvas || !stageRef.current) return;
        const stage = stageRef.current.getBoundingClientRect();
        const margin = 32;
        const availW = Math.max(200, stage.width - margin);
        const availH = Math.max(200, stage.height - margin);
        const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        let displayH = availH;
        let displayW = displayH * aspect;
        if (displayW > availW) {
          displayW = availW;
          displayH = displayW / aspect;
        }
        const scale = displayW / CANVAS_WIDTH;
        canvas.setDimensions({ width: displayW, height: displayH });
        canvas.setZoom(scale);
        canvas.requestRenderAll();
      };

      const initial = CARD_PRESETS[0];
      await loadPreset(initial);
      fitToStage();

      const ro = new ResizeObserver(fitToStage);
      if (stageRef.current) ro.observe(stageRef.current);
      // Hold the observer on the canvas so the cleanup below can stop it.
      (canvas as unknown as { __ro?: ResizeObserver }).__ro = ro;

      setStatus("ready");
    })();

    return () => {
      cancelled = true;
      (canvas as unknown as { __ro?: ResizeObserver })?.__ro?.disconnect();
      canvas?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toolbar actions ────────────────────────────────────────────────────────
  function switchPreset(id: string) {
    const preset = CARD_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePresetId(id);
    void loadPreset(preset);
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

  function bringForward() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) {
      canvas.bringObjectForward(active);
      canvas.renderAll();
    }
  }

  function sendBackward() {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) {
      canvas.sendObjectBackwards(active);
      canvas.renderAll();
    }
  }

  function setFill(color: string) {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set({ fill: color });
    canvas.renderAll();
    setSelected((prev) => (prev ? { ...prev, fill: color } : prev));
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
  }

  // Render at full design resolution, then restore display zoom. Returns the
  // high-res PNG data URL (2480×3508 = A4 @ 300 DPI).
  function captureFullResPng(): string | null {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const savedZoom = canvas.getZoom();
    const savedW = canvas.getWidth();
    const savedH = canvas.getHeight();
    try {
      canvas.setZoom(1);
      canvas.setDimensions({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      // 2× → 2480 × 3508
      return canvas.toDataURL({ format: "png", multiplier: 2, quality: 1 });
    } finally {
      canvas.setDimensions({ width: savedW, height: savedH });
      canvas.setZoom(savedZoom);
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

  return (
    <div className="flex h-screen flex-col bg-[#0f1419]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#161b22] px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            ← Back
          </Link>
          <div className="text-sm text-white/70">
            <span className="text-white/40">QR Card editor · </span>
            <span className="font-semibold text-white">{eventTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPng}
            disabled={busy !== null || status !== "ready"}
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "png" ? "…" : "Download PNG"}
          </button>
          <button
            onClick={exportPdf}
            disabled={busy !== null || status !== "ready"}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "pdf" ? "…" : "Download PDF"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left rail */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-[#161b22] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Start from template
          </p>
          <div className="space-y-2">
            {CARD_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => switchPreset(p.id)}
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

          <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Add
          </p>
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

          <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Tip
          </p>
          <p className="text-xs leading-5 text-white/55">
            Double-click text to edit. Drag any object to move, drag corners to resize/rotate.
          </p>
        </aside>

        {/* Canvas viewport — `stageRef` is measured by the ResizeObserver so
            the canvas always scales to fit without overflowing. */}
        <main
          ref={stageRef}
          className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#0f1419] p-4"
        >
          {status === "loading" && (
            <p className="absolute z-10 text-sm text-white/60">Loading editor…</p>
          )}
          <div className="shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <canvas ref={canvasElRef} />
          </div>
        </main>

        {/* Right rail — object properties */}
        <aside className="w-64 shrink-0 overflow-y-auto border-l border-white/10 bg-[#161b22] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Selected
          </p>
          {!selected ? (
            <p className="text-xs leading-5 text-white/45">
              Click an object on the canvas to see its properties here.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-white/55">
                {selected.type === "textbox" ? "Text" : selected.type === "image" ? "Image" : "Shape"}
              </p>

              {selected.fill !== undefined && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Color
                  </p>
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
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Font
                  </p>
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
                onClick={deleteSelected}
                className="block w-full rounded-md border border-red-400/30 bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
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
