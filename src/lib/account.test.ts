import { describe, expect, it } from "vitest";

import { normalizeAccountType, resolveAccountRedirect } from "@/lib/account";

describe("account helpers", () => {
  it("falls back to photographer for missing or invalid values", () => {
    expect(normalizeAccountType(undefined)).toBe("photographer");
    expect(normalizeAccountType("admin")).toBe("photographer");
  });

  it("keeps couple when the intent is valid", () => {
    expect(normalizeAccountType("couple")).toBe("couple");
  });

  it("resolves redirect targets by account type", () => {
    expect(resolveAccountRedirect("photographer")).toBe("/dashboard");
    expect(resolveAccountRedirect("couple")).toBe("/dashboard/events/new?intent=couple");
    expect(resolveAccountRedirect("couple", { eventSlug: "amina-wedding-123" })).toBe("/dashboard/events/amina-wedding-123");
  });
});
