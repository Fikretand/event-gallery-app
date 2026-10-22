import { describe, expect, it } from "vitest";

import { isCardSizedPng, pngDimensions } from "@/lib/png";

/** Just the signature and an IHDR chunk: enough for the size check. */
function pngHeader(width: number, height: number) {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

describe("png size check", () => {
  it("reads the declared size", () => {
    expect(pngDimensions(pngHeader(2480, 3508))).toEqual({ width: 2480, height: 3508 });
    expect(pngDimensions(Buffer.from("not a png at all, really not"))).toBeNull();
  });

  it("accepts an A4 card in either orientation", () => {
    expect(isCardSizedPng(pngHeader(2480, 3508))).toBe(true);
    expect(isCardSizedPng(pngHeader(3508, 2480))).toBe(true);
    expect(isCardSizedPng(pngHeader(1240, 1754))).toBe(true);
  });

  it("refuses a small file that declares a huge image", () => {
    expect(isCardSizedPng(pngHeader(40000, 40000))).toBe(false);
    expect(isCardSizedPng(pngHeader(3508, 3508))).toBe(false);
    expect(isCardSizedPng(pngHeader(0, 100))).toBe(false);
  });
});
