/**
 * The brand colours as hex, for the places CSS variables cannot reach: the
 * QR code generator, canvas drawing and PNG/PDF rendering. Every value here
 * mirrors a token in `src/app/tokens.css`; change both together.
 */
export const BRAND_HEX = {
  ink: "#172033", // --color-ink
  card: "#ffffff", // printed white; on screen --color-card
  paper: "#fffaf2", // the QR card editor's warm paper
  paper2: "#f2eadf", // --color-paper-2
  accent: "#e27952", // the light terracotta for marks drawn large
  moss: "#38584d", // --color-moss
  blush: "#f8e6da", // the share card's gradient, paper-2 into accent-soft
  blushDeep: "#f3d9c8",
} as const;

/** Colours for a QR code drawn on screen or in print: ink on white. */
export const QR_COLORS = { dark: BRAND_HEX.ink, light: BRAND_HEX.card } as const;
