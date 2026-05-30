// Sharp + pdf-lib helpers for rendering QR posters at print quality.
//
// PNG: A4 portrait at 300 DPI → 2480 × 3508 px
// PDF: A4 page (595.28 × 841.89 pt) with the rendered PNG embedded full-bleed.

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const A4_WIDTH_PX = 2480; // 8.27" × 300 DPI
const A4_HEIGHT_PX = 3508; // 11.69" × 300 DPI

// A4 in PDF points (1 pt = 1/72")
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

/**
 * Rasterize an SVG poster to a 300 DPI A4 PNG buffer.
 *
 * The SVG is authored at viewBox 1240×1754 (A4 portrait) — sharp scales it up
 * via density. We pass `density: 600` so the embedded raster QR image is
 * resampled cleanly rather than just nearest-neighbour-stretched.
 */
export async function renderPosterPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 600 })
    .resize(A4_WIDTH_PX, A4_HEIGHT_PX, {
      fit: "contain",
      background: { r: 255, g: 250, b: 242, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Wrap a poster PNG into a single-page A4 PDF.
 *
 * We embed the high-res PNG full-bleed. At 300 DPI input the printed result is
 * indistinguishable from a true vector PDF, and we avoid the SVG-to-PDF font
 * complexities (librsvg fonts vs PDF fonts).
 */
export async function renderPosterPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  // pdf-lib expects a Uint8Array; Buffer is a Uint8Array subclass so this is fine.
  const img = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  });
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
