// @ts-nocheck
/* eslint-disable */
// scenes-mobile.tsx — Portrait (1080×1920) re-layout of the Confetti explainer.
// Same scene names + exports as the desktop version (./scenes.tsx); only the
// spatial arrangement differs.
//
// Ported from the "Confetti Explainer Mobile" design artifact (Confetti Remix).
// The asset references (originally `assets/X.jpg`) are remapped to the static
// /public/explainer/assets/* paths used by the rest of the app. The standalone
// artifact compresses the timeline with a per-scene TimeScale; here each scene
// runs at its full internal duration because confetti-explainer.tsx already
// schedules the mobile scenes at those durations (Wide 19s · Upload 10s ·
// Gallery 10s · EventTypes 8s · Outro 5s).

import React from "react";
import { Easing, clamp, useTime, useSprite, SpriteContext } from "./animations";
import {
  CFI,
  StripedPlate,
  PhotoCard,
  PhoneFrame,
  QRPlate,
  ConfettiBurst,
  Kicker,
  Display,
  Caption,
} from "./visuals";

const A = "/explainer/assets";

// ═══════════════════════════════════════════════════════════════════════════
// ASSETS MANIFEST — identical filenames to the desktop version. The same
// folder/files serve both layouts.
// ═══════════════════════════════════════════════════════════════════════════
const ASSETS = {
  hero: `${A}/hero.jpg`,
  phones: [
    `${A}/phone-toast.jpg`, `${A}/phone-02.jpg`, `${A}/phone-dance.jpg`,
    `${A}/phone-04.jpg`, `${A}/phone-cake.jpg`, `${A}/phone-06.jpg`,
    `${A}/phone-nana.jpg`, `${A}/phone-08.jpg`, `${A}/phone-09.jpg`,
    `${A}/phone-kids.jpg`,
  ],
  upload: [
    `${A}/upload-1.jpg`, `${A}/upload-2.jpg`, `${A}/upload-3.jpg`,
    `${A}/upload-4.jpg`, `${A}/upload-5.jpg`, `${A}/upload-6.jpg`,
    `${A}/upload-7.jpg`, `${A}/upload-8.jpg`, `${A}/upload-9.jpg`,
  ],
  gallery: [
    `${A}/gallery-ceremony-1.jpg`, `${A}/gallery-ceremony-2.jpg`,
    `${A}/gallery-ceremony-3.jpg`, `${A}/gallery-ceremony-4.jpg`,
    `${A}/gallery-reception-1.jpg`, `${A}/gallery-reception-2.jpg`,
    `${A}/gallery-reception-3.jpg`, `${A}/gallery-reception-4.jpg`,
    `${A}/gallery-cake-1.jpg`, `${A}/gallery-cake-2.jpg`,
    `${A}/gallery-toasts-1.jpg`, `${A}/gallery-toasts-2.jpg`,
  ],
  birthday: [
    `${A}/birthday-1.jpg`, `${A}/birthday-2.jpg`, `${A}/birthday-3.jpg`,
    `${A}/birthday-4.jpg`, `${A}/birthday-5.jpg`, `${A}/birthday-6.jpg`,
  ],
  party: [
    `${A}/party-1.jpg`, `${A}/party-2.jpg`, `${A}/party-3.jpg`,
    `${A}/party-4.jpg`, `${A}/party-5.jpg`, `${A}/party-6.jpg`,
  ],
  generic: [
    `${A}/generic-1.jpg`, `${A}/generic-2.jpg`, `${A}/generic-3.jpg`,
    `${A}/generic-4.jpg`, `${A}/generic-5.jpg`, `${A}/generic-6.jpg`,
  ],
};

// ── Scene wrapper: crossfade at edges ──────────────────────────────────────
export function SceneWrap({ children, fadeIn = 0.35, fadeOut = 0.35 }) {
  const { localTime, duration } = useSprite();
  let opacity = 1;
  if (localTime < fadeIn) opacity = Easing.easeOutCubic(localTime / fadeIn);
  else if (localTime > duration - fadeOut) {
    opacity = Easing.easeInCubic((duration - localTime) / fadeOut);
  }
  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity, willChange: 'opacity', padding: "0px", margin: "-75px 0px 0px", fontSize: "47px"
    }}>{children}</div>);
}

// ── LocalSprite — start/end relative to parent sprite's localTime ──────────
function LocalSprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const parent = useSprite();
  const t = parent.localTime;
  const visible = t >= start && t <= end;
  if (!visible && !keepMounted) return null;
  const duration = end - start;
  const localTime = Math.max(0, t - start);
  const progress =
  duration > 0 && isFinite(duration) ?
  Math.min(1, Math.max(0, localTime / duration)) :
  0;
  const value = { localTime, progress, duration, visible };
  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>);
}

// ── Slow drift ──────────────────────────────────────────────────────────────
function Drift({ x = 6, y = 4, speed = 0.5, rotate = 0, children, style = {} }) {
  const t = useTime();
  const dx = Math.sin(t * speed) * x;
  const dy = Math.cos(t * speed * 0.8) * y;
  const dr = Math.sin(t * speed * 0.6) * rotate;
  return (
    <div style={{
      transform: `translate(${dx}px, ${dy}px) rotate(${dr}deg)`,
      ...style
    }}>{children}</div>);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1 / 2 / 3 — WIDE: hero, then constellation of phones, then QR
// Portrait layout: hero center, 4 phones top, 4 bottom, 1 each side.
// ═══════════════════════════════════════════════════════════════════════════

// Mobile canvas is 1080×1920. Hero centered at (540, 960), 380×480 card.
// Hero bbox: x=[350,730], y=[720,1200]. Phones live OUTSIDE that box.
const PHONE_LAYOUT = [
// Top band (y 60–280) — 4 phones spread across the width
{ x: 60, y: 80, w: 110, rot: -10, hue: 'warm', delay: 0.05, caption: 'zdravica — Lina' },
{ x: 300, y: 130, w: 105, rot: 6, hue: 'paper', delay: 0.25, caption: null },
{ x: 580, y: 60, w: 118, rot: -5, hue: 'cool', delay: 0.10, caption: 'prvi ples — Adi' },
{ x: 860, y: 120, w: 108, rot: 9, hue: 'warm', delay: 0.20, caption: null },
// Side phones (left + right) — fill the negative space beside the hero
{ x: 40, y: 820, w: 120, rot: -8, hue: 'cool', delay: 0.30, caption: 'djeca na podu' },
{ x: 900, y: 860, w: 116, rot: 10, hue: 'paper', delay: 0.35, caption: 'torta — Tina' },
// Bottom band (y 1600–1820) — 4 phones
{ x: 70, y: 1620, w: 112, rot: 7, hue: 'paper', delay: 0.45, caption: null },
{ x: 310, y: 1660, w: 118, rot: -4, hue: 'warm', delay: 0.50, caption: 'Nana, mutna ali ❤' },
{ x: 570, y: 1620, w: 110, rot: 9, hue: 'cool', delay: 0.55, caption: null },
{ x: 830, y: 1660, w: 116, rot: -7, hue: 'paper', delay: 0.40, caption: null }];


function MiniPhone({ w = 110, hue = 'paper', label = 'IMG', src }) {
  return (
    <div style={{
      width: w,
      height: w * (852 / 420),
      background: '#1a2235',
      borderRadius: w * 0.18,
      padding: w * 0.05,
      boxShadow: '0 12px 28px rgba(23,32,51,0.22), 0 2px 6px rgba(23,32,51,0.10)'
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: w * 0.14,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <StripedPlate label={label} hue={hue} size={9} src={src} />
      </div>
    </div>);
}

export function WideScene() {
  const { localTime } = useSprite();
  const t = localTime;

  // Pro card transform
  const proOpacity =
  t < 10.5 ? 1 :
  t > 13.5 ? 0 :
  1 - Easing.easeInCubic((t - 10.5) / 3);
  const proScale = 1 + Math.min(t, 11) * 0.012;
  const proCardY = t < 10.5 ? 0 : -Easing.easeInCubic((t - 10.5) / 3) * 40;

  // Convergence progress
  const conv =
  t < 11 ? 0 :
  t > 14 ? 1 :
  Easing.easeInOutCubic((t - 11) / 3);

  // QR enter
  const qrT = clamp((t - 13.8) / 0.9, 0, 1);
  const qrScale = qrT === 0 ? 0 : 0.4 + 0.6 * Easing.easeOutBack(qrT);
  const qrOpacity = qrT;

  return (
    <div style={{ position: 'absolute', inset: 0, fontSize: "41px" }}>
      {/* ── Pro card centerpiece ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, calc(-50% + ${proCardY}px)) scale(${proScale})`,
        opacity: proOpacity,
        willChange: 'transform, opacity'
      }}>
        <Drift x={4} y={3} speed={0.4} rotate={0.4}>
          <PhotoCard
            width={690} height={900}
            label="Professional gallery"
            hue="warm"
            caption={
            <>
                <div style={{
                fontFamily: CFI.display,
                fontStyle: 'italic',
                color: CFI.ink,
                textTransform: 'none', height: "100px", fontWeight: "600", fontSize: "40px", letterSpacing: "2.3px", textAlign: "left", width: "700px", lineHeight: "2.75"
              }}>
                  „Ljubav je smisao života.”
                </div>
                <div style={{
                fontFamily: CFI.mono,
                textTransform: 'uppercase',
                color: CFI.inkSoft,
                textAlign: 'center',
                marginTop: 16,
                fontStyle: 'normal', fontSize: "28px", height: "0px", lineHeight: "0", letterSpacing: "6.5px", width: "791px"
              }}>
                  — Čovjek za šankom
                </div>
              </>
            }
            shadow="lg"
            border={33}
            src={ASSETS.hero} />
        </Drift>
      </div>

      {/* ── Phones around hero ──────────────────────────────────────── */}
      {PHONE_LAYOUT.map((p, i) => {
        const inStart = 3.5 + p.delay * 6;
        const inEnd = inStart + 0.7;
        const appear =
        t < inStart ? 0 :
        t > inEnd ? 1 :
        Easing.easeOutBack((t - inStart) / (inEnd - inStart));

        // Converge toward portrait center (540, 960)
        const targetX = 540 - p.w / 2;
        const targetY = 960 - p.w * (852 / 420) / 2;
        const px = p.x * (1 - conv) + targetX * conv;
        const py = p.y * (1 - conv) + targetY * conv;
        const rot = p.rot * (1 - conv);
        const shrink = 1 - conv * 0.85;
        const fadeOnConverge = 1 - clamp((conv - 0.55) / 0.45, 0, 1);
        const float = (1 - conv) * Math.sin(t * 1.2 + i) * 4;
        const opacity = clamp(appear, 0, 1) * fadeOnConverge;
        const capOp =
        t < inEnd + 0.4 ? 0 :
        t > 10 ? Math.max(0, 1 - (t - 10) * 1.2) :
        1;

        return (
          <div key={i} style={{
            position: 'absolute',
            left: px, top: py + float,
            transform: `rotate(${rot}deg) scale(${appear * shrink})`,
            transformOrigin: 'center',
            opacity,
            willChange: 'transform, opacity'
          }}>
            <MiniPhone w={p.w} hue={p.hue} label={`IMG_${(i + 1) * 137}`} src={ASSETS.phones[i]} />
            {p.caption &&
            <div style={{
              position: 'absolute',
              top: -22,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: CFI.display,
              fontStyle: 'italic',
              fontSize: 16,
              color: CFI.inkSoft,
              whiteSpace: 'nowrap',
              opacity: capOp
            }}>
                {p.caption}
              </div>
            }
          </div>);
      })}

      {/* ── Caption A — directly BELOW the hero card (card bottom ≈ y1410) ── */}
      <LocalSprite start={0.6} end={3.6}>
        {({ localTime, duration }) => {
          const inT = clamp(localTime / 0.5, 0, 1);
          const outT = clamp((duration - localTime) / 0.4, 0, 1);
          const op = Math.min(Easing.easeOutCubic(inT), outT);
          const rise = (1 - Easing.easeOutCubic(inT)) * 18;
          return (
            <div style={{
              position: 'absolute',
              left: 0, right: 0, top: 1580,
              textAlign: 'center',
              opacity: op,
              transform: `translateY(${rise}px)`
            }}>
              <Display size={52} style={{ textAlign: 'center' }}>
                Fotografov album<br />je <em style={{ fontStyle: 'italic', color: CFI.accent }}>savršen</em>.
              </Display>
            </div>);

        }}
      </LocalSprite>

      {/* ── Caption B — overlaid mid-canvas, clean fade + gentle rise ──── */}
      <LocalSprite start={6.0} end={10.6}>
        {({ localTime, duration }) => {
          const inT = clamp(localTime / 0.6, 0, 1);
          const outT = clamp((duration - localTime) / 0.45, 0, 1);
          const eased = Easing.easeOutCubic(inT);
          const op = Math.min(eased, outT);
          const rise = (1 - eased) * 26;
          return (
            <div style={{
              position: 'absolute',
              left: 40, right: 40, top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex', justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{
                width: 'max-content',
                maxWidth: '100%',
                background: 'rgba(247,239,228,0.62)',
                backdropFilter: 'blur(24px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                borderRadius: 22,
                padding: '18px 36px 22px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 8px 30px rgba(23,32,51,0.18), inset 0 1px 1px rgba(255,255,255,0.6)',
                opacity: op,
                transform: `translateY(${rise}px)`,
                willChange: 'transform, opacity'
              }}>
                <Display size={62} style={{
                  textAlign: 'center',
                  lineHeight: 1.12
                }}>
                  Ali noć je živjela<br />
                  na <em style={{ fontStyle: 'italic', color: '#b8431f' }}>još 47 telefona.</em>
                </Display>
              </div>
            </div>);

        }}
      </LocalSprite>

      {/* ── QR centerpiece ──────────────────────────────────────────── */}
      {qrOpacity > 0 &&
      <div style={{
        position: 'absolute',
        left: '50%', top: 'calc(50% - 100px)',
        transform: `translate(-50%, -50%) scale(${qrScale})`,
        opacity: qrOpacity,
        willChange: 'transform, opacity'
      }}>
          <div style={{
          background: '#fffaf2',
          borderRadius: 28,
          padding: 44,
          boxShadow: '0 28px 60px rgba(23,32,51,0.22), 0 4px 10px rgba(23,32,51,0.10)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
          border: `1px solid ${CFI.rule}`
        }}>
            <div style={{
            fontFamily: CFI.mono,
            fontSize: 22,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: CFI.moss
          }}>Skeniraj da dodaš fotke</div>
            <QRPlate size={620} seed={42} />
            <div style={{
            fontFamily: CFI.mono,
            fontSize: 30,
            color: CFI.ink,
            letterSpacing: '0.04em', textAlign: "center"
          }}>
              confetti.app/<span style={{ color: CFI.accent }}>lejla-amar</span>
            </div>
          </div>
        </div>
      }

      {/* ── Caption C — under the QR ──────────────────────────────── */}
      <LocalSprite start={14.8} end={18.8}>
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: 'calc(50% + 400px)',
          textAlign: 'center'
        }}>
          <Display size={52}>
            Jedan link.<br /><em style={{ fontStyle: 'italic', color: CFI.accent }}>Jedna galerija.</em>
          </Display>
        </div>
      </LocalSprite>
    </div>);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5 — GALLERY WALL fills in (portrait 3×4 grid, sections as columns)
// ═══════════════════════════════════════════════════════════════════════════

// ── GalleryAppShell ─────────────────────────────────────────────────────────
// Reusable "Confetti gallery" app screen filling the 1080×1920 canvas.
// Used by both GalleryScene and EventTypesScene (which swaps content/photos
// for each sub-cut and keeps the chrome identical).
//
// `progress` (0–1) drives the entrance animation: header → tabs → grid → CTA.
function GalleryAppShell({
  progress,
  eventTitle,             // React node
  eventDate,              // string or null to hide
  totalCount,             // number or null/undefined to hide
  tabs = [],              // [{ label, active }]
  photos = [],            // src URLs (need gridRows*3)
  avatarLetter = '·',
  avatarColor,            // optional override
  ctaText = 'Preuzmi sve',
  showCTA = true,
  gridRows = 3,           // 3 = 9 tiles; 2 = 6 tiles (only used by layout='grid')
  layout = 'grid',        // 'grid' | 'featured'
  showShareIcon = true,
}) {
  const p = clamp(progress, 0, 1);

  const headerT = clamp(p * 8,           0, 1);
  const headerY = (1 - Easing.easeOutCubic(headerT)) * -18;
  const tabsT   = clamp((p - 0.04) * 6,  0, 1);
  const tabsY   = (1 - Easing.easeOutCubic(tabsT))   * -10;
  const labelT  = clamp((p - 0.08) * 5,  0, 1);

  const sidePad  = 49;
  const gap      = 14;
  const cols     = 3;
  const tileSize = (1080 - sidePad * 2 - gap * (cols - 1)) / cols; // ~324
  const gridY    = 380;

  // Compute tile positions based on layout. Each entry: { x, y, w, h }.
  const layoutTiles = (() => {
    if (layout === 'featured') {
      const W = 1080 - 2 * sidePad;
      const colW   = (W - gap) / 2;
      const bigH   = 760;
      const smallH = (bigH - gap) / 2;
      return [
        { x: sidePad,              y: gridY,                w: colW, h: bigH   },
        { x: sidePad + colW + gap, y: gridY,                w: colW, h: smallH },
        { x: sidePad + colW + gap, y: gridY + smallH + gap, w: colW, h: smallH },
      ];
    }
    const out = [];
    for (let i = 0; i < gridRows * cols; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      out.push({
        x: sidePad + c * (tileSize + gap),
        y: gridY + r * (tileSize + gap),
        w: tileSize, h: tileSize,
      });
    }
    return out;
  })();

  const gridH    = Math.max(...layoutTiles.map(tt => tt.y + tt.h)) - gridY;
  const ctaY     = gridY + gridH + (gridRows === 2 || layout === 'featured' ? 40 : 70);
  const ctaT     = clamp((p - 0.25) * 4, 0, 1);
  const ctaRise  = (1 - Easing.easeOutBack(ctaT)) * 22;

  const tilesCount = layoutTiles.length;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* ── App header ─────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 108, left: sidePad, right: sidePad,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: headerT,
        transform: `translateY(${headerY}px)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 66, height: 66, borderRadius: '50%',
            background: avatarColor || CFI.accent,
            color: '#fffaf2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: CFI.display, fontStyle: 'italic',
            fontSize: 30, fontWeight: 600,
            boxShadow: '0 6px 14px rgba(226,121,82,0.32)',
          }}>{avatarLetter}</div>
          <div>
            <div style={{
              fontFamily: CFI.display, fontSize: 44, fontStyle: 'italic',
              fontWeight: 500, color: CFI.ink,
              lineHeight: 1, letterSpacing: '-0.01em',
            }}>{eventTitle}</div>
            {eventDate && (
              <div style={{
                fontFamily: CFI.mono, fontSize: 14,
                letterSpacing: '0.18em', color: CFI.inkSoft,
                marginTop: 9, textTransform: 'uppercase',
              }}>{eventDate}</div>
            )}
          </div>
        </div>
        {showShareIcon && (
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(23,32,51,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12m0-12l-4 4m4-4l4 4M5 20h14"
                stroke={CFI.ink} strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Section tabs ───────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 245, left: sidePad, right: sidePad,
        display: 'flex', gap: 10,
        opacity: tabsT,
        transform: `translateY(${tabsY}px)`,
      }}>
        {tabs.map((tab, i) => (
          <div key={i} style={{
            padding: '13px 22px',
            borderRadius: 999,
            background: tab.active ? CFI.ink : 'rgba(23,32,51,0.07)',
            color: tab.active ? '#fbf7f1' : CFI.ink,
            fontFamily: CFI.sans,
            fontSize: 18,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: tab.active ? '0 4px 12px rgba(23,32,51,0.18)' : 'none',
          }}>
            {tab.active && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: CFI.accent, display: 'inline-block',
              }} />
            )}
            {tab.label}
          </div>
        ))}
      </div>

      {/* ── Small label row above grid ─────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 336, left: sidePad, right: sidePad,
        display: 'flex', justifyContent: 'space-between',
        opacity: labelT,
        fontFamily: CFI.mono, fontSize: 12,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: CFI.inkSoft,
      }}>
        <span>najnovije</span>
        {totalCount != null && <span>{tilesCount} od {totalCount}</span>}
      </div>

      {/* ── Photo grid ─────────────────────────────────────────────── */}
      {Array.from({ length: tilesCount }).map((_, i) => {
        const tile = layoutTiles[i];

        const appearAt = 0.1 + i * 0.05;
        const appT = clamp((p - appearAt) / 0.12, 0, 1);
        const eased = Easing.easeOutCubic(appT);

        return (
          <div key={i} style={{
            position: 'absolute',
            left: tile.x, top: tile.y,
            width: tile.w, height: tile.h,
            transform: `translateY(${(1 - eased) * 20}px) scale(${0.93 + 0.07 * eased})`,
            opacity: appT,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 6px 18px rgba(23,32,51,0.08), 0 1px 3px rgba(23,32,51,0.05)',
            willChange: 'transform, opacity',
          }}>
            <StripedPlate src={photos[i]} hue="warm" label={`IMG ${i + 1}`} />
          </div>
        );
      })}

      {/* ── CTA pill ───────────────────────────────────────────────── */}
      {showCTA && (
        <div style={{
          position: 'absolute',
          left: '50%', top: ctaY,
          transform: `translate(-50%, ${ctaRise}px)`,
          opacity: ctaT,
        }}>
          <div style={{
            padding: '20px 34px',
            borderRadius: 999,
            background: CFI.ink,
            color: '#fbf7f1',
            fontFamily: CFI.sans, fontSize: 22, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 18px 38px rgba(23,32,51,0.32), 0 2px 6px rgba(23,32,51,0.16)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ctaText}{totalCount != null ? ` · ${totalCount}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

export function GalleryScene({ titleOverride, dateOverride, kickerOverride } = {}) {
  const { localTime: t } = useSprite();
  const progress = clamp(t / 10, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GalleryAppShell
        progress={progress}
        eventTitle={titleOverride || <>Lejla <span style={{ color: CFI.accent, fontStyle: 'normal' }}>&amp;</span> Amar</>}
        eventDate={dateOverride || '14 . 06 . 26'}
        totalCount={243}
        avatarLetter="L"
        tabs={[
          { label: 'Sve · 243', active: true },
          { label: 'Vjenčanje · 64' },
          { label: 'Veselje · 138' },
        ]}
        photos={ASSETS.gallery.slice(0, 9)}
        ctaText="Preuzmi sve"
        gridRows={3}
      />

      {/* Bottom caption fades in late — sits below the CTA */}
      <LocalSprite start={6.0} end={9.5}>
        {({ localTime, duration }) => {
          const inT = clamp(localTime / 0.5, 0, 1);
          const outT = clamp((duration - localTime) / 0.5, 0, 1);
          const op = Math.min(Easing.easeOutCubic(inT), outT);
          const rise = (1 - Easing.easeOutCubic(inT)) * 14;
          return (
            <div style={{
              position: 'absolute',
              left: 40, right: 40, bottom: 80,
              textAlign: 'center',
              opacity: op,
              transform: `translateY(${rise}px)`
            }}>
              <Display size={44} style={{ lineHeight: 1.14 }}>
                Svaki trenutak.{' '}
                <em style={{ fontStyle: 'italic', color: CFI.accent }}>Jedna privatna galerija.</em>
              </Display>
            </div>);
        }}
      </LocalSprite>
    </div>);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4 — UPLOAD: phone close-up, captions above and below
// ═══════════════════════════════════════════════════════════════════════════
export function UploadScene() {
  const { localTime: t } = useSprite();

  const enterT = clamp(t / 0.9, 0, 1);
  const phoneScale = 0.7 + 0.3 * Easing.easeOutBack(enterT);

  const photos = [
  { hue: 'warm', label: 'IMG_0231' },
  { hue: 'paper', label: 'IMG_0232' },
  { hue: 'cool', label: 'IMG_0233' },
  { hue: 'warm', label: 'IMG_0234' },
  { hue: 'paper', label: 'IMG_0235' },
  { hue: 'cool', label: 'IMG_0236' },
  { hue: 'warm', label: 'IMG_0237' },
  { hue: 'paper', label: 'IMG_0238' },
  { hue: 'cool', label: 'IMG_0239' }];


  const progressT = clamp((t - 1.4) / 4.6, 0, 1);
  const progressEased = Easing.easeInOutCubic(progressT);
  const uploadedCount = Math.floor(progressEased * 147);

  const done = t > 6.2;
  const successT = clamp((t - 6.2) / 0.6, 0, 1);
  const successScale = done ? Easing.easeOutBack(successT) : 0;

  // Phone screen content — same as desktop but slightly tighter padding.
  const PhoneScreen = () =>
  <div style={{
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    paddingTop: 32,
    background: '#f7efe2'
  }}>
      <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 18px'
    }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: CFI.accent }} />
        <div style={{
        fontFamily: CFI.display,
        fontSize: 17, color: CFI.ink, fontWeight: 600
      }}>Lejla &amp; Amar</div>
      </div>
      <div style={{
      padding: '4px 18px 14px',
      fontFamily: CFI.sans, fontSize: 11, color: CFI.inkSoft
    }}>Dodaj svoje fotke · bez registracije</div>

      <div style={{
      flex: 1,
      margin: '0 14px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 6,
      opacity: done ? 0.25 : 1,
      transition: 'opacity 0.4s'
    }}>
        {photos.map((p, i) => {
        const appearAt = 1.2 + i * 0.32;
        const appT = clamp((t - appearAt) / 0.5, 0, 1);
        const eased = Easing.easeOutBack(appT);
        return (
          <div key={i} style={{
            width: '100%',
            aspectRatio: '1',
            overflow: 'hidden',
            borderRadius: 8,
            border: `1px solid rgba(23,32,51,0.08)`,
            boxShadow: '0 2px 6px rgba(23,32,51,0.10), 0 1px 2px rgba(23,32,51,0.06)',
            transform: `scale(${0.6 + 0.4 * eased})`,
            opacity: appT
          }}>
              <StripedPlate label={p.label} hue={p.hue} size={7} src={ASSETS.upload[i]} />
            </div>);
      })}
      </div>

      <div style={{
      margin: '12px 14px 18px',
      padding: '12px 14px',
      borderRadius: 14,
      background: done ? CFI.moss : CFI.ink,
      color: '#fffaf2',
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'background 0.4s'
    }}>
        <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: CFI.sans, fontSize: 12, fontWeight: 600
      }}>
          <span>{done ? 'Sve poslano ✓' : 'Slanje...'}</span>
          <span style={{ fontFamily: CFI.mono, fontSize: 11, opacity: 0.8 }}>
            {done ? '147 / 147' : `${uploadedCount} / 147`}
          </span>
        </div>
        <div style={{
        height: 4, borderRadius: 2,
        background: 'rgba(255,250,242,0.18)',
        overflow: 'hidden'
      }}>
          <div style={{
          height: '100%',
          width: `${progressEased * 100}%`,
          background: CFI.accent,
          borderRadius: 2,
          boxShadow: done ? 'none' : '0 0 12px rgba(226,121,82,0.55)'
        }} />
        </div>
      </div>

      {done &&
    <div style={{
      position: 'absolute',
      left: '50%', top: '46%',
      transform: `translate(-50%, -50%) scale(${successScale})`,
      width: 96, height: 96,
      borderRadius: '50%',
      background: CFI.moss,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fffaf2',
      boxShadow: '0 12px 32px rgba(56,88,77,0.40)'
    }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
    }
    </div>;


  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Above-phone headline */}
      <LocalSprite start={1.0} end={9.5}>
        {({ localTime, duration }) => {
          const op = localTime < 0.4 ?
          Easing.easeOutCubic(localTime / 0.4) :
          duration - localTime < 0.5 ?
          Easing.easeInCubic((duration - localTime) / 0.5) :
          1;
          return (
            <div style={{
              position: 'absolute',
              left: 0, right: 0, top: 120,
              textAlign: 'center',
              opacity: op,
              transform: `translateY(${(1 - Math.min(1, localTime / 0.4)) * 12}px)`
            }}>
              <Kicker>Korak 1 od 1</Kicker>
              <div style={{ height: 12 }} />
              <Display size={72} style={{ lineHeight: 1 }}>
                Tapni. <span style={{ color: CFI.accent, fontStyle: 'italic' }}>Gotovo.</span>
              </Display>
            </div>);

        }}
      </LocalSprite>

      {/* Phone centered */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${phoneScale})`,
        opacity: enterT
      }}>
        <Drift x={3} y={2} speed={0.3}>
          <PhoneFrame width={560}>
            {PhoneScreen()}
          </PhoneFrame>
        </Drift>
      </div>

      {/* Below-phone subtitle */}
      <LocalSprite start={1.6} end={9.5}>
        {({ localTime, duration }) => {
          const op = localTime < 0.5 ?
          Easing.easeOutCubic(localTime / 0.5) :
          duration - localTime < 0.5 ?
          Easing.easeInCubic((duration - localTime) / 0.5) :
          1;
          return (
            <div style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 130,
              textAlign: 'center',
              opacity: op
            }}>
              <Caption size={26} style={{ maxWidth: 900, margin: '0 auto', padding: '0 60px' }}>
                Skeniraj QR. Ubaci sve sa večeri.<br />
                <em style={{ fontStyle: 'italic', color: CFI.ink }}>Bez aplikacije, bez registracije.</em>
              </Caption>
            </div>);

        }}
      </LocalSprite>

      {/* Confetti pop on success */}
      <ConfettiBurst x={540} y={960} count={80} start={6.2} end={9.3} scale={1.3} />
    </div>);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 6 — EVENT TYPES (wedding → birthday → party)
// Portrait: each sub-cut reuses GalleryAppShell, swapping content only.
// ═══════════════════════════════════════════════════════════════════════════
export function EventTypesScene() {
  const { localTime: t } = useSprite();

  // Three sub-cuts: same app shell, different event content.
  const subs = [
    {
      start: 0.0, end: 2.6,
      title: <>Armin</>,
      date: '02 . 03 . 26',
      avatar: 'A',
      totalCount: 187,
      tabs: [
        { label: 'Sve · 187', active: true },
        { label: 'Slavlje · 92' },
        { label: 'Torta · 41' },
      ],
      srcs: ASSETS.birthday,
    },
    {
      start: 2.6, end: 5.2,
      title: <>Anin <em style={{ fontStyle: 'italic', color: CFI.accent }}>party</em></>,
      date: '21 . 09 . 25',
      avatar: 'A',
      totalCount: 94,
      tabs: [
        { label: 'Sve · 94', active: true },
        { label: 'Ples · 52' },
        { label: 'Prijatelji · 33' },
      ],
      srcs: ASSETS.party,
      layout: 'featured',
    },
    {
      start: 5.2, end: 8.0,
      title: <>Tvoj <em style={{ fontStyle: 'italic', color: CFI.accent }}>dan</em></>,
      date: null,
      avatar: '+',
      avatarColor: CFI.moss,
      totalCount: null,
      tabs: [
        { label: 'Pokreni galeriju', active: true },
        { label: 'Saznaj više' },
      ],
      srcs: ASSETS.generic,
      ctaText: 'Pokreni Confetti',
      showCTA: true,
    },
  ];

  const bannerT = clamp(t / 0.6, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {subs.map((s, i) => {
        const fadeIn  = clamp((t - s.start) / 0.35, 0, 1);
        const fadeOut = clamp((s.end - t)   / 0.35, 0, 1);
        const op      = Math.min(fadeIn, fadeOut);
        const subProg = clamp((t - s.start) / (s.end - s.start), 0, 1);
        return (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            opacity: op,
            pointerEvents: 'none',
            visibility: op > 0.001 ? 'visible' : 'hidden',
          }}>
            <GalleryAppShell
              progress={subProg}
              eventTitle={s.title}
              eventDate={s.date}
              totalCount={s.totalCount}
              tabs={s.tabs}
              photos={s.srcs}
              avatarLetter={s.avatar}
              avatarColor={s.avatarColor}
              ctaText={s.ctaText || 'Preuzmi sve'}
              showCTA={s.showCTA !== false}
              gridRows={2}
              layout={s.layout || 'grid'}
            />
          </div>
        );
      })}

      {/* Banner at very bottom — stays throughout the scene */}
      <div style={{
        position: 'absolute',
        left: 40, right: 40, bottom: 180,
        textAlign: 'center',
        opacity: bannerT,
        transform: `translateY(${(1 - bannerT) * 16}px)`,
      }}>
        <Display size={32} style={{ color: CFI.ink, lineHeight: 1.22 }}>
          Vjenčanja · Rođendani · Party<br />
          <em style={{ fontStyle: 'italic', color: CFI.accent }}>sve što vrijedi pamtiti.</em>
        </Display>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 7 — OUTRO / WORDMARK
// ═══════════════════════════════════════════════════════════════════════════
export function OutroScene() {
  const { localTime: t } = useSprite();

  const wordT = clamp(t / 1.0, 0, 1);
  const wordScale = 0.85 + 0.15 * Easing.easeOutBack(wordT);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ConfettiBurst x={540} y={960} count={120} start={0.0} end={3.0} scale={2.0} />

      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${wordScale})`,
        opacity: wordT,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28
      }}>
        <div style={{
          fontFamily: CFI.display,
          fontSize: 150,
          fontWeight: 500,
          letterSpacing: '-0.025em',
          color: CFI.ink,
          fontStyle: 'italic'
        }}>
          C<span style={{ color: CFI.accent }}>o</span>nfetti
        </div>
        <div style={{
          fontFamily: CFI.sans,
          fontSize: 50,
          color: CFI.inkSoft,
          letterSpacing: '0.02em',
          textAlign: 'center'
        }}>
          svaki trenutak,<br /><em style={{ fontStyle: 'italic', color: CFI.accent }}>jedna galerija.</em>
        </div>
      </div>
    </div>);
}
