/**
 * Crop & resize the 8 hero gallery-preview images for the iPhone mockup.
 * Outputs to public/gallery-preview/ at 2× retina resolution.
 *
 *   node scripts/process-gallery-preview.mjs
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = "C:\\Users\\andel\\OneDrive\\Desktop\\Novi nastavak confetti\\fotografije";
const OUT = path.join(__dirname, "..", "public", "gallery-preview");

fs.mkdirSync(OUT, { recursive: true });

// col: 1 = square (200×200 @2x), col: 2 = wide 2:1 (400×200 @2x)
// position: sharp fit:cover anchor ('top' | 'centre' | 'bottom')
const cells = [
  {
    src: "pexels-amineispir-15445089.jpg",
    name: "p1.jpg",
    w: 200, h: 200,
    position: "centre",  // guests + phones, couple centred in frame
  },
  {
    src: "pexels-jonathan-nenemann-13434430.jpg",
    name: "p2.jpg",
    w: 200, h: 200,
    position: "top",     // portrait — keep faces at top
  },
  {
    src: "jakob-owens-SiniLJkXhMc-unsplash.jpg",
    name: "p3.jpg",
    w: 200, h: 200,
    position: "centre",  // couple + palms — couple at mid-frame
  },
  {
    src: "vasily-koloda-Q3DZ_nKdMBg-unsplash.jpg",
    name: "p4.jpg",
    w: 400, h: 200,
    position: "centre",  // wide — bride in air, landscape shot
  },
  {
    src: "leonardo-miranda-dvF6s1H1x68-unsplash.jpg",
    name: "p5.jpg",
    w: 200, h: 200,
    position: "top",     // confetti kiss — keep kiss at top
  },
  {
    src: "pexels-misho-chachanidze-29104578-11030719.jpg",
    name: "p6.jpg",
    w: 200, h: 200,
    position: "top",     // woman with shoe raised — keep her in frame
  },
  {
    src: "samantha-gades-N1CZNuM_Fd8-unsplash.jpg",
    name: "p7.jpg",
    w: 200, h: 200,
    position: "centre",  // rings — already landscape, centre crop
  },
  {
    src: "pexels-breno-cardoso-149064345-18322549.jpg",
    name: "p8.jpg",
    w: 400, h: 200,
    position: "top",     // wide — first kiss, lights — keep couple at top
  },
];

for (const cell of cells) {
  const srcPath = path.join(SRC, cell.src);
  const outPath = path.join(OUT, cell.name);

  await sharp(srcPath)
    .resize(cell.w, cell.h, {
      fit: "cover",
      position: cell.position,
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);

  const stat = fs.statSync(outPath);
  console.log(`✓  ${cell.name}  (${cell.w}×${cell.h})  ${Math.round(stat.size / 1024)} KB`);
}

console.log(`\nAll ${cells.length} images written to public/gallery-preview/`);
