"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  /** The full content (e.g. MediaGrid). */
  children: ReactNode;
  /** Total item count — when ≤ threshold the toggle is hidden. */
  totalCount: number;
  /** Below this count, render children directly without any cap. */
  threshold: number;
  /** Max visible height when collapsed (px). Bottom fade hints at more. */
  collapsedMaxHeight?: number;
  /** Translated labels. */
  strings: {
    recentLabel: string;   // "Recent uploads · {{shown}} of {{total}}"
    showAll: string;       // "Show all {{n}} files"
    showFewer: string;     // "Show only recent"
  };
}

/**
 * Visually caps a (server-rendered) grid at `collapsedMaxHeight` so a long
 * gallery doesn't dominate the dashboard. A fade gradient at the bottom hints
 * at more content; the toggle button expands to full height in place.
 *
 * Server-renders all children (so moderation actions still work on every item
 * once expanded) — only the visual height is gated client-side.
 */
export function CollapsibleSection({
  children,
  totalCount,
  threshold,
  collapsedMaxHeight = 720,
  strings,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = totalCount > threshold;

  if (!needsCollapse) return <>{children}</>;

  const shown = expanded ? totalCount : threshold;

  return (
    <>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-black/45">
        {strings.recentLabel
          .replace("{{shown}}", String(shown))
          .replace("{{total}}", String(totalCount))}
      </p>

      <div
        className={
          expanded
            ? "relative"
            : "relative overflow-hidden"
        }
        style={expanded ? undefined : { maxHeight: collapsedMaxHeight }}
      >
        {children}
        {!expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/95 via-white/70 to-transparent"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/85 px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
      >
        {expanded
          ? strings.showFewer
          : strings.showAll.replace("{{n}}", String(totalCount))}
        <span aria-hidden>{expanded ? "↑" : "↓"}</span>
      </button>
    </>
  );
}
