// Resolve absolute paths to the TTF fonts shipped in /public/fonts/poster.
// Resvg's renderer takes file paths via its `font.fontFiles` option and reads
// each one to register the family name in its font DB. We ship TTF (not WOFF2)
// because resvg-js's fontdb backend only handles TTF/OTF/TTC.
//
// Each family is split into two subsets:
//   *-latin.ttf  → basic Latin (A–Z, a–z, digits, common punctuation)
//   *-ext.ttf    → Latin Extended-A (š ć đ ž č + the rest)
// Both must be present so Bosnian renders correctly — Resvg will pick the
// right one per-character.

import path from "node:path";

export function getPosterFontPaths(): string[] {
  const dir = path.join(process.cwd(), "public", "fonts", "poster");
  return [
    path.join(dir, "playfair-italic-latin.ttf"),
    path.join(dir, "playfair-italic-ext.ttf"),
    path.join(dir, "playfair-bold-latin.ttf"),
    path.join(dir, "playfair-bold-ext.ttf"),
    path.join(dir, "inter-latin.ttf"),
    path.join(dir, "inter-ext.ttf"),
    path.join(dir, "jetbrains-mono-latin.ttf"),
    path.join(dir, "jetbrains-mono-ext.ttf"),
  ];
}
