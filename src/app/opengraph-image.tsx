import { ImageResponse } from "next/og";

import { BRAND_HEX } from "@/lib/brand-colors";

/**
 * The card that shows when a Confetti link is pasted into WhatsApp, Viber,
 * Messenger or Facebook — which is how most of this product will be shared.
 * Without one, a shared link renders as a bare URL.
 *
 * Drawn rather than served as a file so it always matches the brand tokens in
 * `globals.css`, and kept to plain Latin text so it renders correctly in the
 * default font on every platform.
 */

export const alt = "Confetti — private event galleries with QR guest uploads";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori draws this without CSS, so it reads the brand as hex.
const PAPER = BRAND_HEX.paper2;
const INK = BRAND_HEX.ink;
const ACCENT = BRAND_HEX.accent;
const MOSS = BRAND_HEX.moss;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(140deg, ${PAPER} 0%, ${BRAND_HEX.blush} 55%, ${BRAND_HEX.blushDeep} 100%)`,
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: ACCENT,
              display: "flex",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Confetti</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
            Every photo your guests take, in one private gallery.
          </div>
          <div style={{ fontSize: 30, color: "rgba(23,32,51,0.66)", maxWidth: 820 }}>
            One QR code. No app for guests. PIN-protected delivery.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: MOSS }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: MOSS, display: "flex" }} />
          <div>Private event galleries</div>
        </div>
      </div>
    ),
    size,
  );
}
