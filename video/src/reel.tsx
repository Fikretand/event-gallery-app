// Confetti, a 21-second vertical reel.
//
// 1  hook     photo prints drift out of the dark: "Fotografov album je savršen."
// 2  turn     a floor of 93 phones lights up: "Ali noć je živjela na još 93 telefona."
// 3  how      a phone rises and scans the table card: "Bez aplikacije. Bez naloga."
// 4  gather   the photos fly in arcs into one gallery, the count ticks up
// 5  control  one is approved, one is hidden: "Ništa ne ulazi bez vašeg odobrenja."
// 6  end      a terracotta wipe, then the wordmark, the line, the offer, the address

import React from 'react';
import {
  AbsoluteFill, Composition, Easing, Sequence, interpolate, random, registerFont, registerRoot, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import {
  Camera, Image, Layer, Rect, Text, blur, dropShadow, glow, grain, linearGradient, radialGradient,
} from '@kinetographdev/core';
import { onFrame } from '@kinetographdev/audio';

registerFont({ family: 'Playfair', path: staticFile('fonts/playfair-bold.ttf'), weight: 700 });
registerFont({ family: 'Playfair', path: staticFile('fonts/playfair-italic.ttf'), weight: 600, style: 'italic' });
registerFont({ family: 'Inter', path: staticFile('fonts/inter.ttf'), weight: 500 });

// ---- brand (sRGB of the OKLCH tokens) ----
const PAPER = '#fffaf2';
const PAPER2 = '#f2eadf';
const INK = '#172033';
const NIGHT = '#0f1522';
const ACCENT = '#c25a33';
const ACCENT_HI = '#e27952';
const MOSS = '#38584d';
const MOSS_SOFT = '#dfe8e2';
const CARD = '#ffffff';

const W = 1080;
const H = 1920;
const FPS = 30;

// ---- the clock (frames) ----
const T = { hook: 0, turn: 105, how: 225, gather: 345, control: 480, end: 555, out: 630 };

// ---- helpers ----
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, easing = Easing.out(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });
const ph = (name: string) => staticFile(`photos/${name}.webp`);

const PHOTOS = [
  'gallery-ceremony-1', 'phone-dance', 'gallery-cake-1', 'party-4', 'phone-nana', 'gallery-toasts-1', 'birthday-3',
  'phone-kids', 'gallery-reception-1', 'party-2', 'phone-toast', 'generic-3', 'gallery-ceremony-2', 'phone-cake',
  'party-5', 'gallery-reception-2', 'birthday-1', 'hero', 'generic-1', 'phone-02', 'gallery-toasts-2', 'party-1',
];

/** Letters rise into place one after another from `start`; `out` (0 to 1) sends them up and away. */
const Rise: React.FC<{
  text: string; start: number; size: number; color?: string; font?: string; weight?: number; italic?: boolean;
  y: number; x?: number; maxWidth?: number; align?: 'left' | 'center'; stagger?: number; out?: number; lineHeight?: number;
}> = ({ text, start, size, color = PAPER, font = 'Playfair', weight = 700, italic, y, x = 0, maxWidth = W, align = 'center',
  stagger = 1.2, out = 0, lineHeight = 1.1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Array.from(text).length;
  return (
    <Text font={font} weight={weight} fontStyle={italic ? 'italic' : 'normal'} size={size} color={color} x={x} y={y}
          maxWidth={maxWidth} align={align} lineHeight={lineHeight}
          chars={(_c, i) => {
            const s = spring({ frame: frame - start - i * stagger, fps, config: { damping: 17, mass: 0.7 } });
            const leave = interpolate(out * (n * 0.3 + 1) - i * 0.3, [0, 1], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
            return { y: (1 - s) * size * 0.55 - leave * size * 0.6, opacity: Math.min(1, s * 1.4) * (1 - leave) };
          }}>
      {text}
    </Text>
  );
};

/** A printed photo: paper border, the picture inset, one soft shadow. Centred on (0, 0). */
const Print: React.FC<{ src: string; w: number; h: number; pad?: number; shadow?: boolean } & Record<string, unknown>> =
  ({ src, w, h, pad = 12, shadow = true, ...rest }) => (
    <Layer {...rest}>
      <Rect x={-w / 2 - pad} y={-h / 2 - pad} width={w + pad * 2} height={h + pad * 2} radius={10} fill={PAPER}
            effects={shadow ? [dropShadow({ y: 18, blur: 26, color: '#0000004d' })] : []} />
      <Image src={ph(src)} x={-w / 2} y={-h / 2} width={w} height={h} fit="cover" clip={{ kind: 'inset', radius: 6 }} />
    </Layer>
  );

/** A pill label that pops in with overshoot. */
const Pill: React.FC<{ text: string; start: number; fill: string; color: string; x: number; y: number; size?: number; tilt?: number }> =
  ({ text, start, fill, color, x, y, size = 46, tilt = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 190 } });
    const w = text.length * size * 0.56 + size * 1.4;
    const h = size * 1.9;
    return (
      <Layer x={x} y={y} scale={s} rotation={tilt * s} origin="center" opacity={Math.min(1, s * 2)}>
        <Rect x={-w / 2} y={-h / 2} width={w} height={h} radius={h / 2} fill={fill}
              effects={[dropShadow({ y: 10, blur: 16, color: '#00000040' })]} />
        <Text font="Inter" weight={500} size={size} color={color} x={-w / 2} y={-size * 0.62} maxWidth={w} align="center">{text}</Text>
      </Layer>
    );
  };

/** A warm radial light behind a scene. */
const Glow: React.FC<{ color: string; x?: number; y?: number; r?: number; opacity?: number }> = ({ color, x = W / 2, y = H * 0.45, r = 1300, opacity = 1 }) => (
  <Rect x={x - r} y={y - r} width={r * 2} height={r * 2} opacity={opacity}
        fill={radialGradient([color, [1, `${color}00`]])} />
);

// ---- 1. hook: prints drifting out of the dark ----

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = PHOTOS.slice(0, 14).map((src, i) => {
    const r = (k: string) => random(`hook-${k}-${i}`);
    const portrait = i % 3 !== 0;
    return { src, x: (r('x') - 0.5) * 1500, y: (r('y') - 0.5) * 2100, z0: -2600 + i * 175, rot: (r('r') - 0.5) * 24,
             ry: (r('ry') - 0.5) * 40, w: portrait ? 300 : 400, h: portrait ? 420 : 280 };
  });
  const push = interpolate(frame, [0, 120], [0, 900], { easing: Easing.inOut(Easing.sin) });
  return (
    <Layer>
      <Rect width={W} height={H} fill={NIGHT} />
      <Glow color="#3a2a26" y={H * 0.55} r={1400} />
      <Layer x={W / 2} y={H / 2} preserve3d>
        {cards.map((c, i) => {
          const z = c.z0 + push;
          const focus = Math.abs(z + 300);
          const appear = ramp(frame, i * 2, i * 2 + 16);
          return (
            <Print key={c.src} src={c.src} w={c.w} h={c.h} x={c.x} y={c.y + (1 - appear) * 120} z={z} rotation={c.rot}
                   rotateY={c.ry + frame * 0.08 * (i % 2 ? 1 : -1)} opacity={appear * interpolate(z, [-2600, -1400], [0.35, 1], clamp)}
                   effects={[blur(Math.min(14, focus / 110))]} />
          );
        })}
      </Layer>
      <Rect width={W} height={H} fill={radialGradient([[0.45, '#0f152200'], [1, '#0f1522e6']])} />
      <Rect y={H * 0.5} width={W} height={H * 0.5} fill={linearGradient([[0, '#0f152200'], [0.45, '#0f1522d9'], [1, NIGHT]], { angle: 180 })} />
      <Rise text="Fotografov album" start={10} size={108} y={1330} out={ramp(frame, 94, 110)} />
      <Rise text="je savršen." italic weight={600} start={22} size={108} y={1455} color={PAPER2} out={ramp(frame, 92, 108)} />
    </Layer>
  );
};

// ---- 2. turn: a floor of 93 phones ----

const PHONES = 93;
const COLS = 9;

const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tilt = interpolate(frame, [0, 120], [62, 50], { easing: Easing.out(Easing.cubic) });
  const lift = interpolate(frame, [0, 120], [380, 230], { easing: Easing.out(Easing.cubic) });
  const big = spring({ frame: frame - 38, fps, config: { damping: 9, stiffness: 160 } });
  const pw = 92;
  const phh = 176;
  const gx = 30;
  const gy = 40;
  return (
    <Layer>
      <Rect width={W} height={H} fill={NIGHT} />
      <Glow color="#5a2f22" y={H * 0.78} r={1200} opacity={ramp(frame, 20, 70)} />
      <Layer x={W / 2} y={H * 0.86 + lift} rotateX={tilt} preserve3d>
        {Array.from({ length: PHONES }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const d = Math.hypot(col - 4, row - 5);
          const delay = 8 + d * 4 + random(`ph-${i}`) * 6;
          const on = ramp(frame, delay, delay + 8);
          const x = (col - (COLS - 1) / 2) * (pw + gx);
          const y = (row - 5) * (phh + gy);
          return (
            <Layer key={i} x={x - pw / 2} y={y - phh / 2}>
              <Rect width={pw} height={phh} radius={18} fill="#05070c" />
              <Image src={ph(PHOTOS[i % PHOTOS.length])} x={5} y={5} width={pw - 10} height={phh - 10} fit="cover"
                     clip={{ kind: 'inset', radius: 14 }} opacity={on}
                     effects={on > 0.05 ? [glow(14, { color: ACCENT_HI, intensity: 0.5 * on })] : []} />
            </Layer>
          );
        })}
      </Layer>
      <Rect width={W} height={H} fill={linearGradient([[0, NIGHT], [0.5, '#0f1522f2'], [0.66, '#0f152200']], { angle: 180 })} />
      <Rise text="Ali noć je živjela" start={0} size={92} y={210} />
      <Rise text="na još" start={10} size={92} y={325} color={PAPER2} />
      <Layer x={W / 2} y={690} scale={0.6 + 0.4 * big} origin="center" opacity={Math.min(1, big * 2)}>
        <Text font="Playfair" weight={700} size={420} color={ACCENT_HI} x={-W / 2} y={-260} maxWidth={W} align="center"
              effects={[glow(40, { color: ACCENT, intensity: 0.6 })]}>93</Text>
      </Layer>
      <Rise text="telefona." italic weight={600} start={48} size={92} y={930} color={PAPER2} />
    </Layer>
  );
};

// ---- 3. how: a phone scans the table card ----

const How: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 4, fps, config: { damping: 15 } });
  const phone = spring({ frame: frame - 26, fps, config: { damping: 16, stiffness: 110 } });
  const lock = spring({ frame: frame - 58, fps, config: { damping: 10, stiffness: 220 } });
  const push = interpolate(frame, [0, 120], [1, 1.08], { easing: Easing.inOut(Easing.sin) });
  const frameSize = 330 - 60 * lock;
  const cornerColor = lock > 0.5 ? ACCENT_HI : PAPER;
  return (
    <Layer>
      <Rect width={W} height={H} fill={PAPER2} />
      <Glow color="#ffffff" x={W * 0.35} y={H * 0.3} r={1100} />
      <Rise text="Jedan QR kod na stolu." start={0} size={84} y={230} color={INK} maxWidth={W - 160} x={80} lineHeight={1.05} />
      <Layer x={W / 2} y={H / 2 + 60} scale={push} origin="center">
        {/* the table card, standing */}
        <Layer x={-250} y={-330 + (1 - card) * 500} rotation={-4 * card} opacity={card}>
          <Rect width={500} height={660} radius={28} fill={CARD} effects={[dropShadow({ y: 30, blur: 40, color: '#3b2a1a40' })]} />
          <Text font="Playfair" weight={700} size={52} color={INK} x={0} y={50} maxWidth={500} align="center">Skeniraj</Text>
          <Text font="Playfair" weight={600} fontStyle="italic" size={52} color={ACCENT} x={0} y={110} maxWidth={500} align="center">i pošalji</Text>
          <Image src={staticFile('qr.png')} x={90} y={200} width={320} height={320} />
          <Text font="Inter" weight={500} size={28} color="#6b6458" x={0} y={570} maxWidth={500} align="center">www.confetti.ba</Text>
        </Layer>
        {/* the phone, rising in front */}
        <Layer x={150} y={120 + (1 - phone) * 1100} rotation={8 - 4 * phone} opacity={Math.min(1, phone * 3)}>
          <Rect x={-190} y={-380} width={380} height={760} radius={64} fill="#1b1f27"
                effects={[dropShadow({ y: 40, blur: 50, color: '#00000059' })]} />
          <Rect x={-176} y={-366} width={352} height={732} radius={52} fill="#0b0d12" />
          <Image src={staticFile('qr.png')} x={-150} y={-160} width={300} height={300} opacity={0.9} effects={[blur(1 + 3 * (1 - lock))]} />
          {/* viewfinder corners close in on the code */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], k) => (
            <Layer key={k} x={(sx * frameSize) / 2} y={-10 + (sy * frameSize) / 2}>
              <Rect x={sx > 0 ? -44 : 0} y={sy > 0 ? -8 : 0} width={44} height={8} radius={4} fill={cornerColor} />
              <Rect x={sx > 0 ? -8 : 0} y={sy > 0 ? -44 : 0} width={8} height={44} radius={4} fill={cornerColor} />
            </Layer>
          ))}
          <Rect x={-60} y={-352} width={120} height={34} radius={17} fill="#000000" />
          <Layer opacity={ramp(frame, 66, 76)} y={(1 - ramp(frame, 66, 80)) * 30}>
            <Rect x={-150} y={190} width={300} height={84} radius={42} fill={PAPER} />
            <Text font="Inter" weight={500} size={30} color={INK} x={-150} y={214} maxWidth={300} align="center">Pošalji slike</Text>
          </Layer>
        </Layer>
      </Layer>
      <Pill text="Bez aplikacije." start={80} fill={ACCENT} color={CARD} x={330} y={1640} tilt={-3} />
      <Pill text="Bez naloga." start={92} fill={MOSS} color={CARD} x={770} y={1700} tilt={3} />
    </Layer>
  );
};

// ---- 4. gather: everything flies into one gallery ----

const GRID = PHOTOS.slice(0, 12);

const Gather: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tilt = interpolate(frame, [0, 135], [34, 6], { easing: Easing.out(Easing.cubic) });
  const yaw = interpolate(frame, [0, 135], [-14, 2], { easing: Easing.out(Easing.cubic) });
  const panel = spring({ frame, fps, config: { damping: 18 } });
  const pw = 860;
  const gap = 14;
  const cell = (pw - 60 - gap * 2) / 3;
  const landedAt = (i: number) => 14 + i * 5;
  const landed = GRID.filter((_, i) => frame >= landedAt(i) + 10).length;
  return (
    <Layer>
      <Rect width={W} height={H} fill={PAPER} />
      <Glow color={PAPER2} y={H * 0.6} r={1300} />
      <Rise text="Sve stiže na" start={0} size={84} y={170} color={INK} />
      <Rise text="jedno mjesto." italic weight={600} start={10} size={84} y={270} color={ACCENT} />
      <Layer x={W / 2} y={1080} rotateX={tilt} rotateY={yaw} preserve3d scale={0.9 + 0.1 * panel} origin="center">
        <Layer x={-pw / 2} y={-600} opacity={panel}>
          <Rect width={pw} height={1270} radius={36} fill={CARD} effects={[dropShadow({ y: 40, blur: 60, color: '#3b2a1a33' })]} />
          <Text font="Playfair" weight={700} size={50} color={INK} x={30} y={34}>Galerija događaja</Text>
          <Text font="Inter" weight={500} size={30} color="#6b6458" x={30} y={104}>{`U galeriji: ${232 + landed}`}</Text>
        </Layer>
        {GRID.map((src, i) => {
          const t = spring({ frame: frame - landedAt(i), fps, config: { damping: 14, stiffness: 120 } });
          const col = i % 3;
          const row = Math.floor(i / 3);
          const tx = -pw / 2 + 30 + col * (cell + gap) + cell / 2;
          const ty = -600 + 170 + row * (cell + gap) + cell / 2;
          // fly in along an arc from below and to the side
          const fx = (random(`gx-${i}`) - 0.5) * 1400;
          const fy = 1500;
          const cx = (fx + tx) / 2 + (col - 1) * 220;
          const cy = Math.min(fy, ty) - 500;
          const x = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * cx + t * t * tx;
          const y = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * cy + t * t * ty;
          return (
            <Layer key={src} x={x} y={y} z={4 + (1 - t) * 400} rotation={(1 - t) * (random(`gr-${i}`) - 0.5) * 70}
                   opacity={interpolate(frame - landedAt(i), [0, 3], [0, 1], clamp)}>
              <Image src={ph(src)} x={-cell / 2} y={-cell / 2} width={cell} height={cell} fit="cover" clip={{ kind: 'inset', radius: 14 }} />
            </Layer>
          );
        })}
      </Layer>
    </Layer>
  );
};

// ---- 5. control: one approved, one hidden ----

const Control: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: frame - 2, fps, config: { damping: 15 } });
  const b = spring({ frame: frame - 8, fps, config: { damping: 15 } });
  const hide = ramp(frame, 40, 58, Easing.in(Easing.cubic));
  return (
    <Layer>
      <Rect width={W} height={H} fill={PAPER} />
      <Glow color={MOSS_SOFT} x={W * 0.3} y={H * 0.55} r={1000} />
      <Rise text="Ništa ne ulazi bez" start={0} size={78} y={250} color={INK} />
      <Rise text="vašeg odobrenja." italic weight={600} start={10} size={78} y={345} color={MOSS} />
      <Print src="gallery-ceremony-1" w={560} h={380} x={W / 2 - 40} y={840 + (1 - a) * 300} rotation={-5} opacity={a} pad={16} />
      <Pill text="Odobreno" start={26} fill={MOSS} color={CARD} x={W / 2 + 150} y={1040} tilt={-6} />
      <Layer x={W / 2 + hide * 900} y={1420 + (1 - b) * 300} rotation={6 + hide * 25} opacity={b * (1 - hide)}>
        <Print src="party-5" w={380} h={500} effects={[blur(18 * ramp(frame, 22, 36))]} pad={16} />
        <Pill text="Sakriveno" start={30} fill={INK} color={PAPER} x={0} y={0} size={40} />
      </Layer>
    </Layer>
  );
};

// ---- 6. end ----

const End: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pill = spring({ frame: frame - 34, fps, config: { damping: 12, stiffness: 170 } });
  return (
    <Layer>
      <Rect width={W} height={H} fill={INK} />
      <Glow color="#3a2a26" y={H * 0.48} r={1100} />
      <Rise text="Confetti" start={6} size={190} y={720} stagger={2} />
      <Rise text="Svaka uspomena, na jednom mjestu." start={22} size={44} y={960} font="Inter" weight={500} color={PAPER2} stagger={0.5} />
      <Layer x={W / 2} y={1170} scale={pill} origin="center" opacity={Math.min(1, pill * 2)}>
        <Rect x={-310} y={-56} width={620} height={112} radius={56} fill={ACCENT}
              effects={[glow(30, { color: ACCENT, intensity: 0.5 })]} />
        <Text font="Inter" weight={500} size={44} color={CARD} x={-310} y={-30} maxWidth={620} align="center">Besplatno za početak</Text>
      </Layer>
      <Rise text="www.confetti.ba" start={44} size={40} y={1330} font="Inter" weight={500} color={PAPER2} stagger={0.6} />
    </Layer>
  );
};

// ---- transitions ----

/** The scene slides up out of frame, accelerating, with motion blur, from local frame `at`. */
const WhipOut: React.FC<{ at: number; len?: number; children: React.ReactNode }> = ({ at, len = 12, children }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [at, at + len], [0, -H * 1.2], { ...clamp, easing: Easing.in(Easing.poly(4)) });
  return <Layer y={y} motionBlur={frame >= at && frame <= at + len ? { samples: 10, shutter: 1 } : undefined}>{children}</Layer>;
};

/** The scene rises in from below and settles. */
const RiseIn: React.FC<{ len?: number; children: React.ReactNode }> = ({ len = 14, children }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, len], [H * 0.9, 0], { ...clamp, easing: Easing.out(Easing.poly(4)) });
  return <Layer y={y} motionBlur={frame < len ? { samples: 10, shutter: 1 } : undefined}>{children}</Layer>;
};

const FadeIn: React.FC<{ len?: number; children: React.ReactNode }> = ({ len = 10, children }) => {
  const frame = useCurrentFrame();
  return <Layer opacity={ramp(frame, 0, len)}>{children}</Layer>;
};

const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = ramp(frame, T.end - 16, T.end + 6, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill>
      <Camera perspective={1300} />
      <Layer effects={[grain(0.07, { seed: 11, animate: true, monochrome: true })]}>
        <Rect width={W} height={H} fill={NIGHT} />
        <Sequence from={T.hook} durationInFrames={T.turn - T.hook + 10}>
          <Hook />
        </Sequence>
        <Sequence from={T.turn} durationInFrames={T.how - T.turn}>
          <FadeIn len={12}><WhipOut at={T.how - T.turn - 12}><Turn /></WhipOut></FadeIn>
        </Sequence>
        <Sequence from={T.how - 2} durationInFrames={T.gather - T.how + 2}>
          <RiseIn><WhipOut at={T.gather - T.how - 10}><How /></WhipOut></RiseIn>
        </Sequence>
        <Sequence from={T.gather - 2} durationInFrames={T.control - T.gather + 2}>
          <RiseIn><WhipOut at={T.control - T.gather - 10}><Gather /></WhipOut></RiseIn>
        </Sequence>
        <Sequence from={T.control - 2} durationInFrames={T.end - T.control + 8}>
          <RiseIn><Control /></RiseIn>
        </Sequence>
        <Sequence from={T.end}>
          <End />
        </Sequence>
        {/* the terracotta wipe into the end card */}
        <Rect x={-100} y={H - wipe * H * 2.4} width={W + 200} height={H * 1.6}
              opacity={1 - ramp(frame, T.end + 4, T.end + 18)}
              fill={linearGradient([[0, `${ACCENT_HI}00`], [0.25, ACCENT_HI], [0.6, ACCENT], [1, INK]], { angle: 180 })} />
      </Layer>
    </AbsoluteFill>
  );
};

// ---- sound ----

type Ctx = Parameters<Parameters<typeof onFrame>[1]>[0];

function noise(ctx: Ctx, seconds: number, seed: string): AudioBuffer {
  const b = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = random(`${seed}-${i}`) * 2 - 1;
  return b;
}

function tick(ctx: Ctx, t: number, vol = 0.14, from = 1900, to = 950) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + 0.05);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.08);
}

function sweep(ctx: Ctx, t: number, seconds: number, from: number, to: number, peak: number, seed: string) {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx, seconds, seed);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + seconds * 0.85);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + seconds * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  s.connect(bp).connect(g).connect(ctx.destination);
  s.start(t);
}

function thump(ctx: Ctx, t: number, vol = 0.5) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.45);
}

function chime(ctx: Ctx, t: number, vol = 0.08, notes: number[] = [659.25, 987.77]) {
  notes.forEach((hz, k) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = hz;
    const s = t + k * 0.07;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(vol, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 1.4);
    o.connect(g).connect(ctx.destination);
    o.start(s);
    o.stop(s + 1.5);
  });
}

// a soft pad under the whole reel: four chords, slow attack, low-passed
const CHORDS = [
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [130.81, 196.0, 246.94, 329.63], // Cmaj7
  [196.0, 246.94, 293.66, 369.99], // G with a sixth on top
];
const BAR = 5.25; // seconds per chord
onFrame(0, (ctx, t) => {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.05, t + 2.5);
  master.gain.setValueAtTime(0.05, t + T.out / FPS - 2);
  master.gain.exponentialRampToValueAtTime(0.0001, t + T.out / FPS);
  lp.connect(master).connect(ctx.destination);
  CHORDS.forEach((chord, c) => {
    const start = t + c * BAR;
    chord.forEach((hz, k) => {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = hz;
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.18 / (k + 1.5), start + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, start + BAR + 0.6);
        o.connect(g).connect(lp);
        o.start(start);
        o.stop(start + BAR + 0.7);
      }
    });
  });
});

// hook: a tick as the first words land
onFrame(T.hook + 16, (ctx, t) => tick(ctx, t, 0.1));
onFrame(T.hook + 28, (ctx, t) => tick(ctx, t, 0.1, 1600, 800));
// turn: the phones ripple on, then "93" lands
for (let k = 0; k < 14; k++) onFrame(T.turn + 10 + k * 3, (ctx, t) => tick(ctx, t, 0.035 + 0.02 * random(`rip-${k}`), 2600, 1800));
onFrame(T.turn + 38, (ctx, t) => thump(ctx, t, 0.55));
onFrame(T.turn + 39, (ctx, t) => chime(ctx, t, 0.05, [440, 659.25]));
// whips between scenes
for (const at of [T.how - 14, T.gather - 12, T.control - 12]) onFrame(at, (ctx, t) => sweep(ctx, t, 0.6, 300, 4200, 0.35, `w-${at}`));
// how: card lands, the code locks, the pills pop
onFrame(T.how + 10, (ctx, t) => tick(ctx, t, 0.12));
onFrame(T.how + 60, (ctx, t) => chime(ctx, t, 0.07, [880, 1318.5]));
onFrame(T.how + 82, (ctx, t) => tick(ctx, t, 0.14, 1400, 700));
onFrame(T.how + 94, (ctx, t) => tick(ctx, t, 0.14, 1200, 600));
// gather: a tick as each photo lands
for (let i = 0; i < 12; i++) onFrame(T.gather - 2 + 14 + i * 5 + 10, (ctx, t) => tick(ctx, t, 0.07, 2100 - i * 40, 1000));
// control: approved chime, hidden whoosh
onFrame(T.control + 26, (ctx, t) => chime(ctx, t, 0.07, [783.99, 1174.66]));
onFrame(T.control + 38, (ctx, t) => sweep(ctx, t, 0.5, 900, 200, 0.18, 'hide'));
// end: riser under the wipe, a thump and a chime on the wordmark
onFrame(T.end - 30, (ctx, t) => sweep(ctx, t, 1.1, 400, 5200, 0.16, 'riser'));
onFrame(T.end + 6, (ctx, t) => thump(ctx, t, 0.45));
onFrame(T.end + 8, (ctx, t) => chime(ctx, t, 0.08, [523.25, 783.99, 1046.5]));
onFrame(T.end + 34, (ctx, t) => tick(ctx, t, 0.12));

registerRoot(() => <Composition id="Reel" component={Reel} durationInFrames={T.out} fps={FPS} width={W} height={H} />);
