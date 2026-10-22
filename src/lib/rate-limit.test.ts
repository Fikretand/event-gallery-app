import { describe, expect, it } from "vitest";

import { isRateLimited } from "@/lib/rate-limit";

describe("isRateLimited", () => {
  it("uses the shared count when the database answers", async () => {
    expect(await isRateLimited("k1", 8, 60_000, async () => 8)).toBe(false);
    expect(await isRateLimited("k1", 8, 60_000, async () => 9)).toBe(true);
  });

  it("falls back to this instance's memory by default when the database cannot answer", async () => {
    expect(await isRateLimited("k2", 8, 60_000, async () => null)).toBe(false);
  });

  it("refuses when asked to fail closed (gallery PIN)", async () => {
    expect(await isRateLimited("k3", 8, 60_000, async () => null, { failClosed: true })).toBe(true);
    expect(
      await isRateLimited("k4", 8, 60_000, async () => { throw new Error("down"); }, { failClosed: true }),
    ).toBe(true);
  });
});
