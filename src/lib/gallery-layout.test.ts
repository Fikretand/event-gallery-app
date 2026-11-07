import { describe, expect, it } from "vitest";

import {
  formatDuration,
  justifiedRows,
  markHeroes,
  pluralForm,
  ratioOf,
  splitIntoZipParts,
  ZIP_PART_MAX_BYTES,
} from "./gallery-layout";

const photo = (id: string, width: number, height: number) => ({ id, width, height });

describe("justifiedRows", () => {
  it("fills every full row exactly to the container width", () => {
    const items = Array.from({ length: 20 }, (_, i) => photo(`p${i}`, i % 3 ? 3 : 2, i % 3 ? 2 : 3));
    const width = 390;
    const gap = 2;
    const rows = justifiedRows(items, width, 150, gap, 4);
    for (const row of rows.slice(0, -1)) {
      const used = row.items.reduce((sum, cell) => sum + cell.width, 0) + gap * (row.items.length - 1);
      expect(used).toBe(width);
    }
    expect(rows.flatMap((row) => row.items.map((cell) => cell.item.id))).toEqual(items.map((item) => item.id));
  });

  it("keeps a short last row at the capped height instead of stretching it", () => {
    const rows = justifiedRows([photo("a", 2, 3)], 1312, 260, 4, 6);
    expect(rows).toHaveLength(1);
    expect(rows[0].height).toBe(Math.round(260 * 1.35));
    expect(rows[0].items[0].width).toBeLessThan(1312);
  });

  it("never puts more than maxPerRow tiles in a row", () => {
    const items = Array.from({ length: 30 }, (_, i) => photo(`p${i}`, 1, 4));
    for (const row of justifiedRows(items, 1312, 260, 4, 6)) {
      expect(row.items.length).toBeLessThanOrEqual(6);
    }
  });

  it("returns nothing before the width is known", () => {
    expect(justifiedRows([photo("a", 3, 2)], 0, 150, 2, 4)).toEqual([]);
  });
});

describe("markHeroes", () => {
  it("marks the first landscape photo, then waits before the next", () => {
    const items = [photo("a", 2, 3), photo("b", 3, 2), photo("c", 3, 2), ...Array.from({ length: 11 }, (_, i) => photo(`x${i}`, 2, 3)), photo("d", 3, 2)];
    const marked = markHeroes(items);
    expect(marked.filter((item) => item.hero).map((item) => item.id)).toEqual(["b", "d"]);
  });
});

describe("ratioOf", () => {
  it("falls back to a portrait ratio without dimensions", () => {
    expect(ratioOf({ width: null, height: null })).toBeCloseTo(0.8);
    expect(ratioOf({ width: 1600, height: 900 })).toBeCloseTo(16 / 9);
  });
});

describe("splitIntoZipParts", () => {
  it("keeps each part under the byte ceiling, in order", () => {
    const mb = 1024 * 1024;
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, size_bytes: 70 * mb }));
    const parts = splitIntoZipParts(items);
    expect(parts.map((part) => part.ids.length)).toEqual([4, 4, 2]);
    for (const part of parts) expect(part.bytes).toBeLessThanOrEqual(ZIP_PART_MAX_BYTES);
    expect(parts.flatMap((part) => part.ids)).toEqual(items.map((item) => item.id));
  });

  it("gives an oversized file a part of its own", () => {
    const parts = splitIntoZipParts([
      { id: "a", size_bytes: 10 },
      { id: "big", size_bytes: ZIP_PART_MAX_BYTES + 1 },
      { id: "b", size_bytes: 10 },
    ]);
    expect(parts.map((part) => part.ids)).toEqual([["a"], ["big"], ["b"]]);
  });

  it("respects the file-count ceiling", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, size_bytes: 1 }));
    expect(splitIntoZipParts(items, 1000, 3).map((part) => part.ids.length)).toEqual([3, 3, 1]);
  });
});

describe("pluralForm", () => {
  it("follows Bosnian rules", () => {
    expect([1, 21, 101].map(pluralForm)).toEqual(["one", "one", "one"]);
    expect([2, 3, 4, 22, 34].map(pluralForm)).toEqual(["few", "few", "few", "few", "few"]);
    expect([0, 5, 11, 12, 14, 25, 111].map(pluralForm)).toEqual(["many", "many", "many", "many", "many", "many", "many"]);
  });
});

describe("formatDuration", () => {
  it("formats minutes and seconds, empty when unknown", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(7.9)).toBe("0:07");
    expect(formatDuration(null)).toBe("");
  });
});
