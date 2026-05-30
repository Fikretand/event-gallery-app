// QR poster template definitions. Each template returns an SVG string
// designed at viewBox 1240×1754 (A4 portrait). Sharp scales the output up to
// 2480×3508 (A4 at 300 DPI) for print quality.
//
// We intentionally use generic font families ("serif", "sans-serif",
// "monospace") because librsvg (used by sharp on Vercel) has limited custom
// font support. Output stays consistent across environments.

export type PosterTemplate = "minimal-cream" | "confetti-burst" | "polaroid" | "editorial";
export type PosterFormat = "png" | "pdf";

export interface PosterTemplateMeta {
  id: PosterTemplate;
  name: string;
  description: string;
}

export const POSTER_TEMPLATES: PosterTemplateMeta[] = [
  {
    id: "minimal-cream",
    name: "Minimal",
    description: "Čista cream pozadina, akcent boja na imenima. Univerzalan.",
  },
  {
    id: "confetti-burst",
    name: "Confetti Burst",
    description: "Topli narandžasti header, razigrane confetti tačke.",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    description: "Bijeli okvir, QR kao fotografija, casual ton.",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Moss zelena, serif tipografija, premium feel.",
  },
];

export interface PosterData {
  /** Event title (e.g. "Lejla & Amar"). */
  title: string;
  /** Optional formatted date (e.g. "14 . 06 . 26"). */
  date: string | null;
  /** The upload URL (used as the QR display path under the code). */
  uploadUrl: string;
  /** QR code as a data:image/png;base64,... URL. */
  qrDataUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand tokens (mirrors src/components/explainer/visuals — kept duplicated to
// avoid pulling a "use client" module into a server context).
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  paper: "#f2eadf",
  paperLight: "#fbf7f1",
  cream: "#fffaf2",
  ink: "#172033",
  inkSoft: "#3a4258",
  accent: "#e27952",
  accentSoft: "#f6d3c3",
  moss: "#38584d",
  mossSoft: "#cdd9d2",
};

// XML-escape user-provided text so we can interpolate it into SVG safely.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Human-readable URL display (drop protocol + trailing slash). Falls back
// gracefully if the URL is malformed.
function displayUrl(uploadUrl: string): string {
  try {
    const u = new URL(uploadUrl);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return uploadUrl;
  }
}

// Pseudo-random sequence with a fixed seed so confetti placement is
// deterministic for a given seed (so the same template always renders the
// same — important for previews matching the download).
function rngFromSeed(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function seedFromString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 1: Minimal Cream
// ─────────────────────────────────────────────────────────────────────────────
function renderMinimalCream(data: PosterData): string {
  const title = esc(data.title);
  const url = esc(displayUrl(data.uploadUrl));
  const qr = data.qrDataUrl;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
  <rect width="1240" height="1754" fill="${C.cream}"/>

  <!-- Top kicker -->
  <text x="620" y="220" text-anchor="middle"
        font-family="monospace" font-size="28" fill="${C.moss}"
        letter-spacing="8">DOBRODOŠLI NA</text>

  <!-- Title -->
  <text x="620" y="360" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="96" font-weight="600"
        fill="${C.ink}">${title}</text>

  <!-- Thin accent rule -->
  <line x1="500" y1="440" x2="740" y2="440" stroke="${C.accent}" stroke-width="3"/>

  <!-- QR plate -->
  <rect x="320" y="540" width="600" height="600" rx="24" fill="${C.paperLight}"
        stroke="${C.ink}" stroke-opacity="0.08" stroke-width="2"/>
  <image href="${qr}" x="370" y="590" width="500" height="500"/>

  <!-- Subtitle -->
  <text x="620" y="1280" text-anchor="middle"
        font-family="serif" font-size="42" fill="${C.ink}">
    Skeniraj telefonom i ostavi
  </text>
  <text x="620" y="1340" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="42" fill="${C.accent}">
    svoje fotke sa današnjeg dana.
  </text>

  <!-- Bottom URL -->
  <text x="620" y="1600" text-anchor="middle"
        font-family="monospace" font-size="26" fill="${C.inkSoft}"
        letter-spacing="3">${url}</text>

  <!-- Footer wordmark -->
  <text x="620" y="1670" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="32" fill="${C.ink}">
    Powered by <tspan fill="${C.accent}">Confetti</tspan>
  </text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 2: Confetti Burst
// ─────────────────────────────────────────────────────────────────────────────
function renderConfettiBurst(data: PosterData): string {
  const title = esc(data.title);
  const url = esc(displayUrl(data.uploadUrl));
  const qr = data.qrDataUrl;

  // Confetti pieces around the page (deterministic positions)
  const rng = rngFromSeed(seedFromString(data.uploadUrl));
  const palette = [C.accent, C.moss, "#f0c25c", C.accentSoft];
  const confetti: string[] = [];
  for (let i = 0; i < 60; i++) {
    const x = rng() * 1240;
    const y = 480 + rng() * 1180;
    // Skip a circle in the middle to avoid covering the QR
    if (x > 280 && x < 960 && y > 700 && y < 1320) continue;
    const fill = palette[Math.floor(rng() * palette.length)];
    const rot = rng() * 360;
    const kind = rng();
    if (kind < 0.5) {
      const r = 6 + rng() * 8;
      confetti.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"/>`);
    } else {
      const w = 14 + rng() * 14;
      const h = 8 + rng() * 6;
      confetti.push(
        `<rect x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
  <rect width="1240" height="1754" fill="${C.cream}"/>

  <!-- Top accent band -->
  <rect width="1240" height="440" fill="${C.accent}"/>

  <text x="620" y="170" text-anchor="middle"
        font-family="monospace" font-size="26" fill="${C.cream}"
        letter-spacing="9">PRIVATNA GALERIJA</text>

  <text x="620" y="320" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="108" font-weight="600"
        fill="${C.cream}">${title}</text>

  <!-- Confetti scattered -->
  ${confetti.join("\n  ")}

  <!-- QR plate with soft shadow -->
  <rect x="290" y="640" width="660" height="660" rx="32" fill="${C.paperLight}"
        stroke="${C.ink}" stroke-opacity="0.08" stroke-width="2"/>
  <image href="${qr}" x="345" y="695" width="550" height="550"/>

  <!-- Subtitle -->
  <text x="620" y="1410" text-anchor="middle"
        font-family="serif" font-size="46" fill="${C.ink}">
    Sve sa večeri —
  </text>
  <text x="620" y="1470" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="46" fill="${C.accent}">
    na jednom mjestu.
  </text>

  <!-- URL -->
  <text x="620" y="1610" text-anchor="middle"
        font-family="monospace" font-size="26" fill="${C.inkSoft}"
        letter-spacing="3">${url}</text>

  <text x="620" y="1680" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="32" fill="${C.ink}">
    Powered by <tspan fill="${C.accent}">Confetti</tspan>
  </text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 3: Polaroid
// ─────────────────────────────────────────────────────────────────────────────
function renderPolaroid(data: PosterData): string {
  const title = esc(data.title);
  const date = data.date ? esc(data.date) : "";
  const url = esc(displayUrl(data.uploadUrl));
  const qr = data.qrDataUrl;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
  <rect width="1240" height="1754" fill="${C.paper}"/>

  <!-- Top kicker -->
  <text x="620" y="180" text-anchor="middle"
        font-family="monospace" font-size="26" fill="${C.moss}"
        letter-spacing="8">SKENIRAJ I PODIJELI</text>

  <!-- Polaroid card (centered) -->
  <g transform="translate(620 980)">
    <!-- subtle shadow -->
    <rect x="-360" y="-440" width="720" height="900" rx="14" fill="#000" opacity="0.10"
          transform="translate(8 16)"/>
    <!-- frame -->
    <rect x="-360" y="-440" width="720" height="900" rx="14" fill="#ffffff"
          stroke="${C.ink}" stroke-opacity="0.10" stroke-width="2"/>
    <!-- QR slot (the "photo") -->
    <rect x="-320" y="-400" width="640" height="640" fill="${C.paperLight}"/>
    <image href="${qr}" x="-280" y="-360" width="560" height="560"/>

    <!-- Caption area (white below the photo) -->
    <text x="0" y="320" text-anchor="middle"
          font-family="serif" font-style="italic" font-size="68" font-weight="600"
          fill="${C.ink}">${title}</text>
    ${
      date
        ? `<text x="0" y="400" text-anchor="middle"
                 font-family="monospace" font-size="22" fill="${C.inkSoft}"
                 letter-spacing="6">${date}</text>`
        : ""
    }
  </g>

  <!-- Bottom tagline -->
  <text x="620" y="1580" text-anchor="middle"
        font-family="serif" font-size="44" fill="${C.ink}">
    Uslikaj. <tspan font-style="italic" fill="${C.accent}">Dijeli.</tspan> Sjećaj se.
  </text>

  <!-- URL -->
  <text x="620" y="1670" text-anchor="middle"
        font-family="monospace" font-size="22" fill="${C.inkSoft}"
        letter-spacing="3">${url}</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 4: Editorial
// ─────────────────────────────────────────────────────────────────────────────
function renderEditorial(data: PosterData): string {
  const title = esc(data.title);
  const date = data.date ? esc(data.date) : "";
  const url = esc(displayUrl(data.uploadUrl));
  const qr = data.qrDataUrl;

  const dateLine = date ? `PRIVATNA GALERIJA · ${date}` : "PRIVATNA GALERIJA";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
  <rect width="1240" height="1754" fill="${C.cream}"/>

  <!-- Top thick rule -->
  <rect x="120" y="120" width="1000" height="4" fill="${C.moss}"/>

  <!-- Kicker -->
  <text x="620" y="200" text-anchor="middle"
        font-family="monospace" font-size="24" fill="${C.moss}"
        letter-spacing="8">${esc(dateLine)}</text>

  <!-- Title -->
  <text x="620" y="420" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="120" font-weight="700"
        fill="${C.ink}">${title}</text>

  <!-- Hairline accent under the title -->
  <line x1="540" y1="490" x2="700" y2="490" stroke="${C.accent}" stroke-width="2"/>

  <!-- QR plate -->
  <rect x="320" y="600" width="600" height="600" rx="0" fill="${C.paperLight}"
        stroke="${C.moss}" stroke-opacity="0.30" stroke-width="2"/>
  <image href="${qr}" x="370" y="650" width="500" height="500"/>

  <!-- Vertical mono caption to the right of QR -->
  <text x="980" y="900" text-anchor="middle"
        font-family="monospace" font-size="20" fill="${C.moss}"
        letter-spacing="10" transform="rotate(90 980 900)">
    SCAN · UPLOAD · REMEMBER
  </text>

  <!-- Subtitle -->
  <text x="620" y="1340" text-anchor="middle"
        font-family="serif" font-size="44" fill="${C.ink}">
    Skeniraj da podijeliš
  </text>
  <text x="620" y="1400" text-anchor="middle"
        font-family="serif" font-style="italic" font-size="44" fill="${C.accent}">
    svoje trenutke s nama.
  </text>

  <!-- Bottom rule -->
  <rect x="120" y="1580" width="1000" height="2" fill="${C.moss}"/>

  <!-- URL + wordmark on bottom -->
  <text x="140" y="1640" text-anchor="start"
        font-family="monospace" font-size="22" fill="${C.inkSoft}"
        letter-spacing="3">${url}</text>
  <text x="1100" y="1640" text-anchor="end"
        font-family="serif" font-style="italic" font-size="32" fill="${C.ink}">
    <tspan fill="${C.accent}">Confetti</tspan>
  </text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public dispatcher
// ─────────────────────────────────────────────────────────────────────────────
export function renderPosterSvg(template: PosterTemplate, data: PosterData): string {
  switch (template) {
    case "minimal-cream":
      return renderMinimalCream(data);
    case "confetti-burst":
      return renderConfettiBurst(data);
    case "polaroid":
      return renderPolaroid(data);
    case "editorial":
      return renderEditorial(data);
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unknown poster template: ${String(_exhaustive)}`);
    }
  }
}

export function isPosterTemplate(value: unknown): value is PosterTemplate {
  return (
    value === "minimal-cream" ||
    value === "confetti-burst" ||
    value === "polaroid" ||
    value === "editorial"
  );
}

export function isPosterFormat(value: unknown): value is PosterFormat {
  return value === "png" || value === "pdf";
}
