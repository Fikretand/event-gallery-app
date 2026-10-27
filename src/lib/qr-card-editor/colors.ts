/**
 * Colours the card editor hands to Fabric and to the canvas. A canvas cannot
 * read CSS variables, so these stay hex; each mirrors a token in
 * `src/app/tokens.css` (ink, ink-2, accent, moss, paper, paper-2) or is a
 * print colour offered in the swatches (gold, deep terracotta, white, black).
 */
export const CANVAS_INK = "#172033";
export const CANVAS_WHITE = "#ffffff";
export const CANVAS_BLACK = "#000000";
export const CANVAS_PAPER = "#fffaf2";
/** Selection handles and borders: the accent. */
export const HANDLE_ACCENT = "#e27952";
/** The pink smart-guide line, chosen to stand out from every card colour. */
export const GUIDE_COLOR = "#ff3d8b";

export const SWATCHES = [
  CANVAS_INK, "#3a4258", HANDLE_ACCENT, "#38584d", "#f0c25c",
  CANVAS_PAPER, "#f2eadf", "#b8431f", CANVAS_WHITE, CANVAS_BLACK,
];
