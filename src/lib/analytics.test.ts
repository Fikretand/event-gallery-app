import { describe, expect, it } from "vitest";

import { isTrackedPath, sanitizeUrl } from "./analytics";

describe("isTrackedPath", () => {
  it("measures the public pages in both languages", () => {
    for (const path of ["/", "/bs", "/en", "/bs/pricing", "/en/for-couples", "/bs/dogadjaji/vjencanje", "/bs/signup", "/bs/signup/verify"]) {
      expect(isTrackedPath(path)).toBe(true);
    }
  });

  it("never measures guest galleries, upload pages, admin or auth routes", () => {
    for (const path of [
      "/gallery/mia-dario",
      "/bs/gallery/mia-dario",
      "/en/gallery/mia-dario/live",
      "/upload/mia-dario",
      "/bs/upload/mia-dario",
      "/admin",
      "/bs/admin/users",
      "/auth/confirm",
      "/api/uploads/confirm",
    ]) {
      expect(isTrackedPath(path)).toBe(false);
    }
  });

  it("measures only the dashboard pages with no event or person in the URL", () => {
    expect(isTrackedPath("/dashboard")).toBe(true);
    expect(isTrackedPath("/bs/dashboard/")).toBe(true);
    expect(isTrackedPath("/bs/dashboard/couple")).toBe(true);
    expect(isTrackedPath("/dashboard/billing")).toBe(true);
    expect(isTrackedPath("/dashboard/events/mia-dario")).toBe(false);
    expect(isTrackedPath("/bs/dashboard/events/mia-dario/gallery")).toBe(false);
    expect(isTrackedPath("/bs/dashboard/profile")).toBe(false);
    expect(isTrackedPath("/dashboard/events/new")).toBe(false);
  });

  it("does not mistake a page that only starts with a private word", () => {
    expect(isTrackedPath("/bs/galleryfoo")).toBe(true);
  });
});

describe("sanitizeUrl", () => {
  it("removes the email the signup flow puts in the URL", () => {
    expect(sanitizeUrl("https://www.confetti.ba/bs/signup/verify?intent=couple&email=ana%40example.com")).toBe(
      "https://www.confetti.ba/bs/signup/verify?intent=couple",
    );
  });

  it("keeps campaign tags and drops tokens and fragments", () => {
    expect(sanitizeUrl("https://www.confetti.ba/bs?utm_source=instagram&code=abc&token_hash=x#faq")).toBe(
      "https://www.confetti.ba/bs?utm_source=instagram",
    );
  });
});
