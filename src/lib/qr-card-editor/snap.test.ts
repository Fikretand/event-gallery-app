import { describe, expect, it } from "vitest";

import { computeSnap, snapAngle } from "./snap";

const page = { width: 1240, height: 1754 };
const box = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h });

describe("computeSnap", () => {
  it("does nothing when nothing is close", () => {
    const r = computeSnap(box(100, 100, 200, 100), [box(700, 900, 100, 100)], page, 8);
    expect(r).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("snaps the centre to the card centre and draws the centre line", () => {
    // centre x = 100 + 200/2 = 200 … put it 5 px off 620
    const r = computeSnap(box(515, 100, 200, 100), [], page, 8);
    expect(r.dx).toBe(5);
    expect(r.guides).toContainEqual({ axis: "x", pos: 620, from: 0, to: 1754, kind: "page" });
  });

  it("lines a left edge up with another object's left edge, with a line joining them", () => {
    const other = box(300, 200, 400, 80);
    const r = computeSnap(box(304, 600, 150, 60), [other], page, 8);
    expect(r.dx).toBe(-4);
    expect(r.guides).toContainEqual({ axis: "x", pos: 300, from: 200, to: 660, kind: "object" });
  });

  it("aligns centres vertically with another object", () => {
    const other = box(100, 500, 200, 100); // centre y 550
    const r = computeSnap(box(700, 522, 100, 60), [other], page, 8); // centre y 552
    expect(r.dy).toBe(-2);
    expect(r.guides.some((g) => g.axis === "y" && g.pos === 550 && g.kind === "object")).toBe(true);
  });

  it("picks the nearest target when several are in range", () => {
    const r = computeSnap(box(97, 100, 100, 100), [box(95, 400, 50, 50), box(101, 700, 50, 50)], page, 8);
    // left 97: 95 is 2 away, 101 is 4 away
    expect(r.dx).toBe(-2);
  });

  it("does not draw a line for merely touching a card edge", () => {
    const r = computeSnap(box(3, 100, 100, 100), [], page, 8);
    expect(r.dx).toBe(-3);
    expect(r.guides).toEqual([]);
  });
});

describe("snapAngle", () => {
  it("straightens near 0/90/180/270 and the diagonals", () => {
    expect(snapAngle(3)).toEqual({ angle: 0, snapped: true });
    expect(snapAngle(-2)).toEqual({ angle: 0, snapped: true });
    expect(snapAngle(358)).toEqual({ angle: 0, snapped: true });
    expect(snapAngle(88)).toEqual({ angle: 90, snapped: true });
    expect(snapAngle(47)).toEqual({ angle: 45, snapped: true });
  });

  it("leaves other angles alone", () => {
    expect(snapAngle(20)).toEqual({ angle: 20, snapped: false });
    expect(snapAngle(-30)).toEqual({ angle: 330, snapped: false });
  });
});
