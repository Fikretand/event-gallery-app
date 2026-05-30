// Resvg + pdf-lib helpers for rendering QR posters at print quality.
//
// PNG: A4 portrait at 300 DPI → 2480 × 3508 px, rendered by Resvg (Rust-based
//      SVG renderer with explicit font buffer loading — does NOT rely on the
//      system fontconfig DB, which is empty on Vercel's serverless runtime).
// PDF: A4 page (595.28 × 841.89 pt) with the rendered PNG embedded full-bleed.

import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";

const A4_WIDTH_PX = 2480; // 8.27" × 300 DPI

// A4 in PDF points (1 pt = 1/72")
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

/**
 * Rasterize an SVG poster to a 300 DPI A4 PNG buffer.
 *
 * The SVG is authored at viewBox 1240×1754 (A4 portrait). Resvg scales it up to
 * 2480 px wide; the height follows the viewBox aspect ratio.
 *
 * `fontFiles` must point at every family the SVG references (Playfair Display,
 * Inter, JetBrains Mono). Resvg matches `font-family` against the family name
 * embedded in each WOFF2 file's metadata. `loadSystemFonts: false` keeps the
 * output deterministic and avoids cold-start font discovery on Vercel.
 */
export function renderPosterPng(svg: string, fontFiles: string[]): Buffer {
  const resvg = new Resvg(svg, {
    background: "#fffaf2",
    fitTo: { mode: "width", value: A4_WIDTH_PX },
    font: {
      fontFiles,
      defaultFontFamily: "Inter",
      loadSystemFonts: false,
    },
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

/**
 * Wrap a poster PNG into a single-page A4 PDF.
 *
 * We embed the high-res PNG full-bleed. At 300 DPI input the printed result is
 * indistinguishable from a true vector PDF, and we avoid the SVG-to-PDF font
 * complexities entirely.
 */
export async function renderPosterPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
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
