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

  it("falls back when nothing was given", () => {
    expect(safeNextPath(null, "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("", "/dashboard")).toBe("/dashboard");
  });
});
