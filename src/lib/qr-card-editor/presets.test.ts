import { describe, expect, it } from "vitest";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CARD_PRESETS,
  type CardPreset,
  type PresetObject,
} from "@/lib/qr-card-editor/presets";

/**
 * Geometry guard for the QR card presets. These are authored by hand in a
 * 1240×1754 coordinate space and are never rendered in CI, so a typo in a
 * coordinate silently ships a broken template. These assertions catch the
 * failure modes that actually matter on a printed A4 card.
 */

/** Axis-aligned box for an object, or null when the kind has no fixed box. */
function boxOf(obj: PresetObject): { left: number; top: number; right: number; bottom: number } | null {
  switch (obj.kind) {
    case "rect":
      return { left: obj.left, top: obj.top, right: obj.left + obj.width, bottom: obj.top + obj.height };
    case "svg":
      return { left: obj.left, top: obj.top, right: obj.left + obj.width, bottom: obj.top + obj.height };
    case "qr-slot":
      return { left: obj.left, top: obj.top, right: obj.left + obj.size, bottom: obj.top + obj.size };
    case "line":
      return { left: obj.left, top: obj.top, right: obj.left + obj.width, bottom: obj.top + obj.strokeWidth };
    case "text":
      // Height depends on wrapping, so only the horizontal box is reliable.
      return { left: obj.left, top: obj.top, right: obj.left + obj.width, bottom: obj.top };
  }
}

const label = (preset: CardPreset, index: number) => `${preset.id}[${index}]`;

describe("QR card presets", () => {
  it("exposes a usable set of templates", () => {
    expect(CARD_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("has unique ids and non-empty names", () => {
    const ids = CARD_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const preset of CARD_PRESETS) {
      expect(preset.name.trim(), `${preset.id} name`).not.toBe("");
      expect(preset.background, `${preset.id} background`).toMatch(/^#|^rgb/);
    }
  });

  it("gives every template exactly one QR slot, large enough to scan in print", () => {
    for (const preset of CARD_PRESETS) {
      const slots = preset.objects.filter((o) => o.kind === "qr-slot");
      expect(slots.length, `${preset.id} qr-slot count`).toBe(1);

      const slot = slots[0] as Extract<PresetObject, { kind: "qr-slot" }>;
      // Below ~300px on a 1240px-wide A4 the printed code gets unreliable.
      expect(slot.size, `${preset.id} qr size`).toBeGreaterThanOrEqual(300);
    }
  });

  it("keeps every object inside the card", () => {
    for (const preset of CARD_PRESETS) {
      preset.objects.forEach((obj, i) => {
        const box = boxOf(obj);
        if (!box) return;
        const where = label(preset, i);
        expect(box.left, `${where} left`).toBeGreaterThanOrEqual(0);
        expect(box.top, `${where} top`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${where} right`).toBeLessThanOrEqual(CANVAS_WIDTH);
        expect(box.bottom, `${where} bottom`).toBeLessThanOrEqual(CANVAS_HEIGHT);
      });
    }
  });

  it("uses sane text metrics", () => {
    for (const preset of CARD_PRESETS) {
      preset.objects.forEach((obj, i) => {
        if (obj.kind !== "text") return;
        const where = label(preset, i);
        expect(obj.fontSize, `${where} fontSize`).toBeGreaterThan(0);
        expect(obj.width, `${where} width`).toBeGreaterThan(0);
        expect(obj.text.trim(), `${where} text`).not.toBe("");
        // A text box narrower than its own line height can never lay out.
        expect(obj.width, `${where} width vs fontSize`).toBeGreaterThan(obj.fontSize);
      });
    }
  });

  it("leaves the QR slot clear of other filled boxes", () => {
    for (const preset of CARD_PRESETS) {
      const slot = preset.objects.find((o) => o.kind === "qr-slot") as
        | Extract<PresetObject, { kind: "qr-slot" }>
        | undefined;
      if (!slot) continue;
      const slotBox = { left: slot.left, top: slot.top, right: slot.left + slot.size, bottom: slot.top + slot.size };

      preset.objects.forEach((obj, i) => {
        // Only opaque fills would obscure the code; borders use "transparent".
        if (obj.kind !== "rect" || obj.fill === "transparent") return;
        const box = boxOf(obj)!;
        const overlaps =
          box.left < slotBox.right &&
          box.right > slotBox.left &&
          box.top < slotBox.bottom &&
          box.bottom > slotBox.top;
        // The plate behind the QR is allowed to contain it; anything else is not.
        const contains =
          box.left <= slotBox.left && box.right >= slotBox.right && box.top <= slotBox.top && box.bottom >= slotBox.bottom;
        expect(!overlaps || contains, `${label(preset, i)} must not cover the QR`).toBe(true);
      });
    }
  });
});
