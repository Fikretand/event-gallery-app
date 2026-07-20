/* eslint-disable */
// @ts-nocheck
"use client";

// Confetti 3D hero loop — QR code → camera → "Confetti" wordmark, seamless.
// Ported from the "Confetti Hero Animation" Claude Design artifact. The
// standalone artifact loaded three via an importmap CDN + a Google Fonts link;
// here three comes from the npm package and Playfair Display is registered
// from the app's local TTF so the wordmark samples correctly with no external
// request. All work is scoped to a useEffect and fully torn down on unmount.

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ConfettiHeroAnimation({ className }: { className?: string }) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    let cancelled = false;
    let raf = 0;
    let io1: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    let onVisibility: (() => void) | null = null;

    // ── CONFIG ──────────────────────────────────────────────
    const TRANSPARENT_BG = true;
    const N = 640;
    const DUR = [1.2, 1.8, 1.2, 1.8, 1.8, 1.8]; // holdQR, A, holdCam, B, holdWord, C
    const T = DUR.reduce((a, b) => a + b, 0);

    const HEX = { paper: 0xf2eadf, paperL: 0xfbf7f1, paperD: 0xece2d3, ink: 0x172033, inkS: 0x3a4258, terra: 0xe27952, terraS: 0xf6d3c3, moss: 0x38584d, glass: 0x101a2b };
    const C: Record<string, THREE.Color> = {};
    for (const k in HEX) C[k] = new THREE.Color(HEX[k]);

    const mulberry32 = (a) => function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const ease = (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

    // ── SCENE ───────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    if (!TRANSPARENT_BG) renderer.setClearColor(HEX.paper, 1); else renderer.setClearColor(0x000000, 0);
    holder.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    cam.position.set(0, 0.35, 7.6); cam.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xfff3e6, 1.5));
    const key = new THREE.DirectionalLight(0xfff1e0, 2.0); key.position.set(-3.5, 4.5, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xf6d3c3, 0.6); fill.position.set(3, -1, 4); scene.add(fill);

    const grp = new THREE.Group(); scene.add(grp);

    // soft fake contact shadow
    let shadow;
    {
      const sc = document.createElement("canvas"); sc.width = sc.height = 256;
      const g = sc.getContext("2d");
      const rg = g.createRadialGradient(128, 128, 10, 128, 128, 120);
      rg.addColorStop(0, "rgba(23,32,51,0.30)"); rg.addColorStop(1, "rgba(23,32,51,0)");
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(sc);
      shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.05; scene.add(shadow);
    }

    function roundedBoxGeo(r, bev) {
      const s = new THREE.Shape(); const w = 0.5 - r, h = 0.5 - r;
      s.moveTo(-w, -0.5);
      s.lineTo(w, -0.5); s.quadraticCurveTo(0.5, -0.5, 0.5, -h);
      s.lineTo(0.5, h); s.quadraticCurveTo(0.5, 0.5, w, 0.5);
      s.lineTo(-w, 0.5); s.quadraticCurveTo(-0.5, 0.5, -0.5, h);
      s.lineTo(-0.5, -h); s.quadraticCurveTo(-0.5, -0.5, -w, -0.5);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, steps: 1, curveSegments: 6 });
      geo.center();
      return geo;
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: HEX.paperL, roughness: 0.92, metalness: 0 });
    const bodyGeo = roundedBoxGeo(0.07, 0.03);
    const body = new THREE.Mesh(bodyGeo, bodyMat); grp.add(body);

    const lens = new THREE.Group(); grp.add(lens);
    const barrelMat = new THREE.MeshStandardMaterial({ color: HEX.inkS, roughness: 0.85 });
    const ringMat = new THREE.MeshStandardMaterial({ color: HEX.terra, roughness: 0.75 });
    const glassMat = new THREE.MeshStandardMaterial({ color: HEX.glass, roughness: 0.6 });
    const glintMat = new THREE.MeshStandardMaterial({ color: HEX.paperD, roughness: 0.5 });
    const barrelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.34, 48);
    const ringGeo = new THREE.TorusGeometry(0.585, 0.065, 16, 64);
    const glassGeo = new THREE.CircleGeometry(0.46, 48);
    const glintGeo = new THREE.CircleGeometry(0.09, 24);
    {
      const barrel = new THREE.Mesh(barrelGeo, barrelMat); barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.08; lens.add(barrel);
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.z = 0.25; lens.add(ring);
      const glass = new THREE.Mesh(glassGeo, glassMat); glass.position.z = 0.255; lens.add(glass);
      const glint = new THREE.Mesh(glintGeo, glintMat); glint.position.set(-0.16, 0.16, 0.26); lens.add(glint);
    }

    const tileGeo = roundedBoxGeo(0.16, 0);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 });
    const tiles = new THREE.InstancedMesh(tileGeo, tileMat, N);
    tiles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    grp.add(tiles);

    const mkState = () => ({ pos: new Float32Array(3 * N), scl: new Float32Array(3 * N), col: new Float32Array(3 * N) });
    const S = [mkState(), mkState(), mkState()];
    const put = (st, i, x, y, z, sx, sy, sz, c) => { const j = 3 * i; st.pos[j] = x; st.pos[j + 1] = y; st.pos[j + 2] = z; st.scl[j] = sx; st.scl[j + 1] = sy; st.scl[j + 2] = sz; st.col[j] = c.r; st.col[j + 1] = c.g; st.col[j + 2] = c.b; };

    // STATE 0 — QR
    const finderTL = new THREE.Vector3();
    {
      const n = 21, cell = 0.132, rng = mulberry32(7);
      const m = Array.from({ length: n }, () => Array(n).fill(0));
      const finder = (r, c2) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const ring = (i === 0 || i === 6 || j === 0 || j === 6), core = (i >= 2 && i <= 4 && j >= 2 && j <= 4); m[r + i][c2 + j] = (ring || core) ? 1 : 0; } };
      finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
      for (let i = 8; i < n - 8; i++) { m[6][i] = 1 - (i % 2); m[i][6] = 1 - (i % 2); }
      const zone = (r, c2) => (r < 8 && c2 < 8) || (r < 8 && c2 >= n - 8) || (r >= n - 8 && c2 < 8) || r === 6 || c2 === 6;
      for (let r = 0; r < n; r++) for (let c2 = 0; c2 < n; c2++) if (!zone(r, c2)) m[r][c2] = rng() < 0.46 ? 1 : 0;
      const dark = [];
      for (let r = 0; r < n; r++) for (let c2 = 0; c2 < n; c2++) if (m[r][c2]) dark.push([(c2 - (n - 1) / 2) * cell, ((n - 1) / 2 - r) * cell]);
      const ts = 0.116, tz = 0.072;
      for (let i = 0; i < N; i++) {
        if (i < dark.length) { const [x, y] = dark[i]; put(S[0], i, x, y, 0.115, ts, ts, tz, C.ink); }
        else { const k = Math.floor(rng() * dark.length); const [x, y] = dark[k]; put(S[0], i, x, y, 0.115 + tz * (1 + Math.floor(rng() * 2)), ts, ts, tz, rng() < 0.9 ? C.ink : C.inkS); }
      }
      finderTL.set((3 - (n - 1) / 2) * cell, ((n - 1) / 2 - 3) * cell, 0.14);
    }

    // STATE 1 — Camera
    {
      const rng = mulberry32(21);
      const details = [];
      for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 3; c2++) details.push([-1.19 + c2 * 0.14, 0.62 - r * 0.14, 0.37, 0.115, C.paperD]);
      for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 2; c2++) details.push([0.90 + c2 * 0.13, 0.98, -0.06 + r * 0.13, 0.105, C.terra]);
      for (let k = 0; k < 5; k++) details.push([1.27, -0.55 + k * 0.22, 0.37, 0.10, C.inkS]);
      details.push([0.62, 0.50, 0.37, 0.10, C.moss]); details.push([0.80, 0.50, 0.37, 0.10, C.paperD]);
      for (let i = 0; i < N; i++) {
        if (i < details.length) { const [x, y, z, s, c] = details[i]; put(S[1], i, x, y, z, s, s, 0.07, c); }
        else put(S[1], i, (rng() * 2 - 1) * 1.35, -0.05 + (rng() * 2 - 1) * 0.8, (rng() * 2 - 1) * 0.2, 0.001, 0.001, 0.001, C.ink);
      }
    }

    // STATE 2 — "Confetti" wordmark
    const oCenter = new THREE.Vector3(0, 0, 0);
    async function buildWordState() {
      // Register Playfair Display italic from the app's local TTF so the
      // family is available to document.fonts without an external request.
      try {
        const face = new FontFace("Playfair Display", 'url(/fonts/poster/playfair-italic-latin.ttf)', { style: "italic", weight: "400 700" });
        await face.load();
        document.fonts.add(face);
      } catch { /* fall back to whatever Playfair the page already has */ }
      try { await document.fonts.load('italic 700 210px "Playfair Display"'); } catch {}

      const cv = document.createElement("canvas"); cv.width = 1600; cv.height = 440;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.font = 'italic 700 210px "Playfair Display"'; g.fillStyle = "#000";
      const x0 = 60, base = 300, word = "Confetti";
      g.fillText(word, x0, base);
      const wAll = g.measureText(word).width, wC = g.measureText("C").width, wCo = g.measureText("Co").width;
      const oA = x0 + wC - 6, oB = x0 + wCo + 6;
      const img = g.getImageData(0, 0, cv.width, cv.height).data;
      const scale = 3.9 / wAll, cx = x0 + wAll / 2, cy = base - 70;
      let pts = null;
      for (const step of [4, 5, 6, 7, 8]) {
        const p = [];
        for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step)
          if (img[(y * cv.width + x) * 4 + 3] > 140) p.push([x, y]);
        pts = p; if (p.length <= N * 1.6) break;
      }
      const rng = mulberry32(99);
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      let ox = 0, oy = 0, oc = 0;
      for (let i = 0; i < N; i++) {
        const [px, py] = pts[i % pts.length];
        const x = (px - cx) * scale, y = (cy - py) * scale;
        const isO = px >= oA && px <= oB && py > base - 160;
        if (isO) { ox += x; oy += y; oc++; }
        const jitter = (i >= pts.length) ? (rng() - 0.5) * 0.03 : 0;
        const z = (i % 2 ? 0.035 : -0.035) + jitter;
        const s = 0.062;
        put(S[2], i, x + jitter, y + jitter, z, s, s, 0.055, isO ? C.terra : (rng() < 0.92 ? C.ink : C.inkS));
      }
      if (oc) oCenter.set(ox / oc, oy / oc, 0.1);
    }

    const MORPH = [];
    function buildMorphs() {
      MORPH.length = 0;
      const amps = [0.55, 1.7, 1.0];
      const spinP = [0.35, 0.85, 0.55];
      const confetti = [C.terra, C.terraS, C.moss, C.ink, C.paperL, C.paperD];
      for (let mI = 0; mI < 3; mI++) {
        const a = S[mI], b = S[(mI + 1) % 3];
        const rng = mulberry32(300 + mI);
        const mid = new Float32Array(3 * N), mcol = new Float32Array(3 * N), ax = new Float32Array(3 * N);
        const turns = new Float32Array(N), stag = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const j = 3 * i;
          let dx = rng() * 2 - 1, dy = rng() * 2 - 1 + 0.45, dz = rng() * 2 - 1 + 0.55;
          const L = Math.hypot(dx, dy, dz) || 1; const amp = amps[mI] * (0.45 + rng());
          mid[j] = (a.pos[j] + b.pos[j]) / 2 + dx / L * amp;
          mid[j + 1] = (a.pos[j + 1] + b.pos[j + 1]) / 2 + dy / L * amp;
          mid[j + 2] = (a.pos[j + 2] + b.pos[j + 2]) / 2 + dz / L * amp;
          const cc = (mI === 0 && rng() < 0.6) ? null : confetti[Math.floor(rng() * confetti.length)];
          if (cc) { mcol[j] = cc.r; mcol[j + 1] = cc.g; mcol[j + 2] = cc.b; }
          else { mcol[j] = (a.col[j] + b.col[j]) / 2; mcol[j + 1] = (a.col[j + 1] + b.col[j + 1]) / 2; mcol[j + 2] = (a.col[j + 2] + b.col[j + 2]) / 2; }
          let axx = rng() * 2 - 1, axy = rng() * 2 - 1, axz = rng() * 2 - 1; const AL = Math.hypot(axx, axy, axz) || 1;
          ax[j] = axx / AL; ax[j + 1] = axy / AL; ax[j + 2] = axz / AL;
          turns[i] = rng() < spinP[mI] ? 1 : 0;
          stag[i] = rng();
        }
        MORPH.push({ mid, mcol, ax, turns, stag });
      }
    }

    const bodyKF = [
      { pos: [0, 0, 0], scl: [3.05, 3.05, 0.16], col: C.paperL },
      { pos: [0, -0.05, 0], scl: [3.1, 1.95, 0.72], col: C.ink },
      { pos: [0, -0.05, 0], scl: [0.001, 0.001, 0.001], col: C.ink },
    ];
    const lensKF = () => [
      { pos: [finderTL.x, finderTL.y, finderTL.z], scl: 0.055 },
      { pos: [-0.55, -0.05, 0.42], scl: 1 },
      { pos: [oCenter.x, oCenter.y, oCenter.z], scl: 0.04 },
    ];

    const SEGSTART = []; { let acc = 0; for (const d of DUR) { SEGSTART.push(acc); acc += d; } }
    const segAt = (tt) => { for (let s = DUR.length - 1; s >= 0; s--) if (tt >= SEGSTART[s]) return { s, u: (tt - SEGSTART[s]) / DUR[s] }; return { s: 0, u: 0 }; };
    const SEGMAP = [{ hold: 0 }, { morph: 0 }, { hold: 1 }, { morph: 1 }, { hold: 2 }, { morph: 2 }];

    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3(), _axis = new THREE.Vector3();
    const _c3 = new THREE.Color();

    function applyTime(tt) {
      const { s, u } = segAt(tt);
      const seg = SEGMAP[s];
      const colAttr = tiles.instanceColor.array;
      if (seg.hold !== undefined) {
        const st = S[seg.hold];
        for (let i = 0; i < N; i++) {
          const j = 3 * i;
          _p.set(st.pos[j], st.pos[j + 1], st.pos[j + 2]); _q.identity(); _sc.set(st.scl[j], st.scl[j + 1], st.scl[j + 2]);
          _m.compose(_p, _q, _sc); tiles.setMatrixAt(i, _m);
          colAttr[j] = st.col[j]; colAttr[j + 1] = st.col[j + 1]; colAttr[j + 2] = st.col[j + 2];
        }
        const bk = bodyKF[seg.hold]; body.position.fromArray(bk.pos); body.scale.fromArray(bk.scl); body.quaternion.identity(); bodyMat.color.copy(bk.col);
        const lk = lensKF()[seg.hold]; lens.position.fromArray(lk.pos); lens.scale.setScalar(lk.scl);
      } else {
        const mI = seg.morph, a = S[mI], b = S[(mI + 1) % 3], M = MORPH[mI];
        for (let i = 0; i < N; i++) {
          const j = 3 * i;
          const e = ease(Math.min(1, Math.max(0, (u - M.stag[i] * 0.32) / 0.68)));
          const b1 = (1 - e) * (1 - e), b2 = 2 * (1 - e) * e, b3 = e * e;
          _p.set(b1 * a.pos[j] + b2 * M.mid[j] + b3 * b.pos[j], b1 * a.pos[j + 1] + b2 * M.mid[j + 1] + b3 * b.pos[j + 1], b1 * a.pos[j + 2] + b2 * M.mid[j + 2] + b3 * b.pos[j + 2]);
          _sc.set(a.scl[j] + (b.scl[j] - a.scl[j]) * e, a.scl[j + 1] + (b.scl[j + 1] - a.scl[j + 1]) * e, a.scl[j + 2] + (b.scl[j + 2] - a.scl[j + 2]) * e);
          if (M.turns[i]) { _axis.set(M.ax[j], M.ax[j + 1], M.ax[j + 2]); _q.setFromAxisAngle(_axis, e * Math.PI * 2); } else _q.identity();
          _m.compose(_p, _q, _sc); tiles.setMatrixAt(i, _m);
          colAttr[j] = b1 * a.col[j] + b2 * M.mcol[j] + b3 * b.col[j];
          colAttr[j + 1] = b1 * a.col[j + 1] + b2 * M.mcol[j + 1] + b3 * b.col[j + 1];
          colAttr[j + 2] = b1 * a.col[j + 2] + b2 * M.mcol[j + 2] + b3 * b.col[j + 2];
        }
        const e = ease(u);
        const A = bodyKF[mI], B = bodyKF[(mI + 1) % 3];
        body.position.set(A.pos[0] + (B.pos[0] - A.pos[0]) * e, A.pos[1] + (B.pos[1] - A.pos[1]) * e, A.pos[2] + (B.pos[2] - A.pos[2]) * e);
        body.scale.set(A.scl[0] + (B.scl[0] - A.scl[0]) * e, A.scl[1] + (B.scl[1] - A.scl[1]) * e, A.scl[2] + (B.scl[2] - A.scl[2]) * e);
        _c3.copy(A.col).lerp(B.col, e); bodyMat.color.copy(_c3);
        if (mI === 1) body.rotation.z = Math.sin(e * Math.PI) * 0.35; else body.rotation.z = 0;
        const LK = lensKF(), LA = LK[mI], LB = LK[(mI + 1) % 3];
        lens.position.set(LA.pos[0] + (LB.pos[0] - LA.pos[0]) * e, LA.pos[1] + (LB.pos[1] - LA.pos[1]) * e, LA.pos[2] + (LB.pos[2] - LA.pos[2]) * e);
        lens.scale.setScalar(LA.scl + (LB.scl - LA.scl) * e);
      }
      tiles.instanceMatrix.needsUpdate = true;
      tiles.instanceColor.needsUpdate = true;
      const ph = tt / T;
      grp.rotation.y = 0.10 * Math.sin(ph * Math.PI * 2);
      grp.rotation.x = 0.035 * Math.sin(ph * Math.PI * 4 + 1.3);
      grp.position.y = 0.07 * Math.sin(ph * Math.PI * 4);
      shadow.material.opacity = 0.85 - 0.12 * Math.sin(ph * Math.PI * 4);
    }

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true, tAcc = 0, last = performance.now();
    io1 = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 });
    io1.observe(holder);
    onVisibility = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", onVisibility);

    function resize() {
      const w = holder.clientWidth, h = holder.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    ro = new ResizeObserver(() => { resize(); if (!cancelled) renderer.render(scene, cam); });
    ro.observe(holder);

    function frame(now) {
      if (cancelled) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, now - last); last = now;
      if (!visible || document.hidden) return;
      tAcc = (tAcc + dt / 1000) % T;
      applyTime(tAcc);
      renderer.render(scene, cam);
    }

    buildWordState().then(() => {
      if (cancelled) return;
      buildMorphs();
      resize();
      if (reduce) {
        applyTime(SEGSTART[4] + DUR[4] * 0.5); // freeze on the wordmark
        grp.rotation.set(0, 0, 0); grp.position.y = 0;
        renderer.render(scene, cam);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });

    // ── Teardown ────────────────────────────────────────────
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io1?.disconnect();
      ro?.disconnect();
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      [bodyGeo, tileGeo, barrelGeo, ringGeo, glassGeo, glintGeo].forEach((geo) => geo.dispose());
      [bodyMat, tileMat, barrelMat, ringMat, glassMat, glintMat].forEach((mat) => mat.dispose());
      shadow.geometry.dispose();
      shadow.material.map?.dispose();
      shadow.material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === holder) holder.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={holderRef} className={className} aria-hidden="true" />;
}

export default ConfettiHeroAnimation;
