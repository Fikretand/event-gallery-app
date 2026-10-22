const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A4 at 300 DPI, the largest card the editor exports, in either orientation. */
export const MAX_CARD_SIDE = 3508;
export const MAX_CARD_PIXELS = 2480 * 3508;

/**
 * Width and height from a PNG's IHDR chunk, or null when the bytes are not a
 * PNG. Read before decoding: a few KB of compressed PNG can declare a size
 * that decodes to gigabytes of RGBA.
 */
export function pngDimensions(png: Buffer) {
  if (png.byteLength < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (png.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export function isCardSizedPng(png: Buffer) {
  const size = pngDimensions(png);
  if (!size || size.width === 0 || size.height === 0) return false;
  return size.width <= MAX_CARD_SIDE && size.height <= MAX_CARD_SIDE && size.width * size.height <= MAX_CARD_PIXELS;
}
