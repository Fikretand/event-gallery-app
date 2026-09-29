// Smart guides for the card editor, the way Canva or Illustrator do them: a
// dragged object snaps when one of its edges or its centre lines up with the
// card's centre or edges, or with another object's edges or centre, and a line
// shows what it lined up with. Rotation snaps to "straight" (every 45°).
//
// Pure geometry in design pixels, so it can be tested without a canvas.

export type Box = { left: number; top: number; right: number; bottom: number };

export type Guide = {
  /** A vertical line at x = pos ("x"), or a horizontal line at y = pos ("y"). */
  axis: "x" | "y";
  pos: number;
  /** Extent of the line along the other axis. */
  from: number;
  to: number;
  /** "page" lines span the card; "object" lines join the two objects. */
  kind: "page" | "object";
};

type Target = { pos: number; kind: "page" | "object"; box?: Box };

const anchorsX = (b: Box) => [b.left, (b.left + b.right) / 2, b.right];
const anchorsY = (b: Box) => [b.top, (b.top + b.bottom) / 2, b.bottom];

/** The smallest shift (within `threshold`) that lines one of `anchors` up with one of `targets`. */
function bestShift(anchors: number[], targets: Target[], threshold: number): number | null {
  let best: number | null = null;
  for (const a of anchors) {
    for (const t of targets) {
      const d = t.pos - a;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  return best;
}

/**
 * Where to move `moving` so it lines up, and which guides to draw.
 *
 * @param others    boxes of the other objects on the card
 * @param page      card size
 * @param threshold snapping distance in design pixels
 */
export function computeSnap(
  moving: Box,
  others: Box[],
  page: { width: number; height: number },
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const xTargets: Target[] = [
    { pos: 0, kind: "page" },
    { pos: page.width / 2, kind: "page" },
    { pos: page.width, kind: "page" },
    ...others.flatMap((box) => anchorsX(box).map((pos) => ({ pos, kind: "object" as const, box }))),
  ];
  const yTargets: Target[] = [
    { pos: 0, kind: "page" },
    { pos: page.height / 2, kind: "page" },
    { pos: page.height, kind: "page" },
    ...others.flatMap((box) => anchorsY(box).map((pos) => ({ pos, kind: "object" as const, box }))),
  ];

  const dx = bestShift(anchorsX(moving), xTargets, threshold) ?? 0;
  const dy = bestShift(anchorsY(moving), yTargets, threshold) ?? 0;

  const snapped: Box = {
    left: moving.left + dx,
    right: moving.right + dx,
    top: moving.top + dy,
    bottom: moving.bottom + dy,
  };

  // Every alignment that holds after the shift gets a line — two objects can
  // line up on the left edge and the centre at once, and both are worth seeing.
  const guides: Guide[] = [];
  const seen = new Set<string>();
  const add = (g: Guide) => {
    const key = `${g.axis}:${g.kind}:${Math.round(g.pos)}:${Math.round(g.from)}:${Math.round(g.to)}`;
    if (!seen.has(key)) {
      seen.add(key);
      guides.push(g);
    }
  };
  const EPS = 0.5;
  {
    for (const t of xTargets) {
      if (!anchorsX(snapped).some((a) => Math.abs(a - t.pos) <= EPS)) continue;
      if (t.kind === "page") {
        // Lining up with a card edge is only worth a line at the centre.
        if (t.pos === page.width / 2) add({ axis: "x", pos: t.pos, from: 0, to: page.height, kind: "page" });
      } else if (t.box) {
        add({
          axis: "x",
          pos: t.pos,
          from: Math.min(t.box.top, snapped.top),
          to: Math.max(t.box.bottom, snapped.bottom),
          kind: "object",
        });
      }
    }
  }
  {
    for (const t of yTargets) {
      if (!anchorsY(snapped).some((a) => Math.abs(a - t.pos) <= EPS)) continue;
      if (t.kind === "page") {
        if (t.pos === page.height / 2) add({ axis: "y", pos: t.pos, from: 0, to: page.width, kind: "page" });
      } else if (t.box) {
        add({
          axis: "y",
          pos: t.pos,
          from: Math.min(t.box.left, snapped.left),
          to: Math.max(t.box.right, snapped.right),
          kind: "object",
        });
      }
    }
  }

  return { dx, dy, guides };
}

/**
 * Snap an angle to the nearest multiple of `step` when within `tolerance`
 * degrees of it — "straight" at 0°, 90°, 180°, 270°, and the diagonals.
 * Returns the angle normalised to [0, 360).
 */
export function snapAngle(angle: number, step = 45, tolerance = 4): { angle: number; snapped: boolean } {
  const normalised = ((angle % 360) + 360) % 360;
  const nearest = Math.round(normalised / step) * step;
  if (Math.abs(normalised - nearest) <= tolerance) {
    return { angle: nearest % 360, snapped: true };
  }
  return { angle: normalised, snapped: false };
}
