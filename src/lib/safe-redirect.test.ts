import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/dashboard/couple", "/dashboard")).toBe("/dashboard/couple");
    expect(safeNextPath("/reset-password", "/x")).toBe("/reset-password");
  });

  it("refuses anything that leaves the site", () => {
    expect(safeNextPath("https://evil.example/login", "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)", "/dashboard")).toBe("/dashboard");
  });

  it("refuses paths a browser would turn into another host", () => {
    // Audit lead: browsers strip the tab, leaving "//evil.example".
    expect(safeNextPath("/\t/evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/\n/evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/%09/evil.example".replace("%09", "\t"), "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/a\\b", "/dashboard")).toBe("/dashboard");
  });

  it("still allows query strings and encoded characters on this site", () => {
    expect(safeNextPath("/bs/dashboard?saved=1", "/x")).toBe("/bs/dashboard?saved=1");
    expect(safeNextPath("/gallery/a%20b", "/x")).toBe("/gallery/a%20b");
  });

  it("falls back when nothing was given", () => {
    expect(safeNextPath(null, "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("", "/dashboard")).toBe("/dashboard");
  });
});
