import { describe, expect, it } from "vitest";

import { CORNERS, SCREEN, homographyCoefficients, homographyMatrix3d, project } from "./homography";

describe("hero screen homography", () => {
  it("puts each screen corner on the phone's corner in the photo", () => {
    const hh = homographyCoefficients(SCREEN.w, SCREEN.h, CORNERS);
    const src: [number, number][] = [
      [0, 0],
      [SCREEN.w, 0],
      [SCREEN.w, SCREEN.h],
      [0, SCREEN.h],
    ];
    src.forEach(([x, y], i) => {
      const [u, v] = project(hh, x, y);
      expect(Math.abs(u - CORNERS[i][0])).toBeLessThan(0.5);
      expect(Math.abs(v - CORNERS[i][1])).toBeLessThan(0.5);
    });
  });

  it("is the identity for a quad equal to the box", () => {
    const m = homographyMatrix3d(100, 50, [
      [0, 0],
      [100, 0],
      [100, 50],
      [0, 50],
    ]);
    expect(m).toBe("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)");
  });
});
