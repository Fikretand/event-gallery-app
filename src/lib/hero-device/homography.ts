// Maps the phone's screen (a flat 393×852 box of HTML) onto the tilted phone
// in the hero photo. Four point correspondences define a projective
// transform; CSS takes it as a matrix3d.

export type Point = [number, number];

/** The live screen, in CSS px (an iPhone 15 Pro viewport). */
export const SCREEN = { w: 393, h: 852 } as const;

/** The screen's corners in the 1024×768 photo: top-left, top-right, bottom-right, bottom-left. */
export const CORNERS: Point[] = [
  [401, 119],
  [588, 133],
  [680, 643],
  [487, 650],
];

/** The part of the photo the hero shows. */
export const CROP = { x: 290, y: 80, w: 480, h: 688 } as const;

/** The 8 coefficients of the projective map taking the w×h box onto `quad`. */
export function homographyCoefficients(w: number, h: number, quad: Point[]): number[] {
  const src: Point[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = quad[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Gaussian elimination with partial pivoting.
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const hh = new Array<number>(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * hh[k];
    hh[r] = s / A[r][r];
  }
  return hh;
}

/** Apply the map to one point — what the browser does with the matrix3d. */
export function project(hh: number[], x: number, y: number): Point {
  const d = hh[6] * x + hh[7] * y + 1;
  return [(hh[0] * x + hh[1] * y + hh[2]) / d, (hh[3] * x + hh[4] * y + hh[5]) / d];
}

/** The CSS `matrix3d(...)` for the map (column-major, z untouched). */
export function homographyMatrix3d(w: number, h: number, quad: Point[]): string {
  const hh = homographyCoefficients(w, h, quad);
  const m = [hh[0], hh[3], 0, hh[6], hh[1], hh[4], 0, hh[7], 0, 0, 1, 0, hh[2], hh[5], 0, 1];
  return `matrix3d(${m.map((x) => +x.toFixed(10)).join(",")})`;
}
