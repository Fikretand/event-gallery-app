import { describe, expect, it } from "vitest";

import { hashPin, verifyPin } from "@/lib/security";

describe("pin security", () => {
  it("verifies a matching pin", () => {
    const hash = hashPin("1234");
    expect(verifyPin("1234", hash)).toBe(true);
  });

  it("rejects a wrong pin", () => {
    const hash = hashPin("1234");
    expect(verifyPin("9999", hash)).toBe(false);
  });
});
