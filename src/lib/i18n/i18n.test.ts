import { describe, expect, it } from "vitest";

import { daysWord } from "./index";

describe("daysWord", () => {
  it("follows Bosnian number agreement, not an English 's'", () => {
    expect([1, 2, 4, 5, 7, 11, 12, 21, 22, 25, 101, 111].map((n) => `${n} ${daysWord(n, "bs")}`)).toEqual([
      "1 dan",
      "2 dana",
      "4 dana",
      "5 dana",
      "7 dana",
      "11 dana",
      "12 dana",
      "21 dan",
      "22 dana",
      "25 dana",
      "101 dan",
      "111 dana",
    ]);
  });

  it("uses day/days in English", () => {
    expect(daysWord(1, "en")).toBe("day");
    expect(daysWord(0, "en")).toBe("days");
    expect(daysWord(7, "en")).toBe("days");
  });
});
