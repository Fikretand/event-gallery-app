import { describe, expect, it } from "vitest";

import { PASSWORD_MIN_LENGTH, passwordChecks, passwordMeetsPolicy } from "@/lib/password-policy";

/**
 * These mirror the Supabase dashboard setting. If someone relaxes one side, the
 * other starts lying to the user, so the cases are spelled out rather than
 * generated.
 */
describe("passwordMeetsPolicy", () => {
  it("accepts a password with all four classes and enough length", () => {
    expect(passwordMeetsPolicy("Sarajevo1!")).toBe(true);
  });

  it("rejects one that is merely long", () => {
    expect(passwordMeetsPolicy("aaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("rejects a missing class, one at a time", () => {
    expect(passwordMeetsPolicy("sarajevo1!")).toBe(false); // no uppercase
    expect(passwordMeetsPolicy("SARAJEVO1!")).toBe(false); // no lowercase
    expect(passwordMeetsPolicy("Sarajevoo!")).toBe(false); // no digit
    expect(passwordMeetsPolicy("Sarajevo12")).toBe(false); // no symbol
  });

  it("rejects anything under the minimum, even with all four classes", () => {
    expect(passwordMeetsPolicy("Sa1!")).toBe(false);
    expect("Sar1!aj".length).toBeLessThan(PASSWORD_MIN_LENGTH);
    expect(passwordMeetsPolicy("Sar1!aj")).toBe(false);
  });

  it("does not count a character Supabase would refuse as a symbol", () => {
    // Outside Supabase's allowed set — accepting it here would hand the user a
    // password our form likes and Supabase rejects.
    expect(passwordMeetsPolicy("Sarajevo1€")).toBe(false);
  });
});

describe("passwordChecks", () => {
  it("ticks off each rule independently, which is what the form shows", () => {
    expect(passwordChecks("")).toEqual({ length: false, upper: false, lower: false, digit: false, symbol: false });
    expect(passwordChecks("sarajevo")).toEqual({ length: true, upper: false, lower: true, digit: false, symbol: false });
    expect(passwordChecks("Sarajevo1!")).toEqual({ length: true, upper: true, lower: true, digit: true, symbol: true });
  });
});
