import { describe, expect, it } from "vitest";

import { PHOTO_MS_MAX, PHOTO_MS_MIN, photoDurationMs, qrDurationMs, qrEvery } from "./live-pacing";

describe("photoDurationMs", () => {
  it("slows down for a few photos and speeds up for many, within its bounds", () => {
    expect(photoDurationMs(0)).toBe(8_000);
    expect(photoDurationMs(10)).toBe(8_000);
    expect(photoDurationMs(30)).toBe(6_500);
    expect(photoDurationMs(50)).toBe(5_900);
    expect(photoDurationMs(100)).toBe(4_900);
    expect(photoDurationMs(200)).toBe(4_000);
    expect(photoDurationMs(5_000)).toBe(4_000);
  });

  it("never gets slower as the gallery grows", () => {
    let previous = Infinity;
    for (let n = 0; n <= 400; n += 1) {
      const ms = photoDurationMs(n);
      expect(ms).toBeLessThanOrEqual(previous);
      expect(ms).toBeGreaterThanOrEqual(PHOTO_MS_MIN);
      expect(ms).toBeLessThanOrEqual(PHOTO_MS_MAX);
      previous = ms;
    }
  });
});

describe("qrEvery", () => {
  it("shows the QR after 5, 10 or 15 photos as the pace rises", () => {
    expect(qrEvery(10)).toBe(5);
    expect(qrEvery(30)).toBe(5);
    expect(qrEvery(50)).toBe(10);
    expect(qrEvery(100)).toBe(15);
    expect(qrEvery(200)).toBe(15);
  });

  it("comes after each round when there are fewer photos than that", () => {
    expect(qrEvery(1)).toBe(1);
    expect(qrEvery(3)).toBe(3);
    expect(qrEvery(0)).toBe(5);
  });

  it("brings the QR back every 30 to 75 seconds", () => {
    for (const n of [10, 20, 30, 50, 80, 100, 150, 200, 500]) {
      const gap = qrEvery(n) * photoDurationMs(n);
      expect(gap).toBeGreaterThanOrEqual(30_000);
      expect(gap).toBeLessThanOrEqual(75_000);
    }
  });
});

describe("qrDurationMs", () => {
  it("keeps the QR up longer than a photo", () => {
    for (const n of [1, 30, 100, 300]) expect(qrDurationMs(n)).toBeGreaterThan(photoDurationMs(n));
    expect(qrDurationMs(5)).toBe(12_000);
    expect(qrDurationMs(300)).toBe(10_000);
  });
});
