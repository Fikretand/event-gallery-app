"use client";

import dynamic from "next/dynamic";

// Three.js is heavy (~150 KB), and this loop only lives in the footer CTA far
// below the fold. Code-split it into its own chunk and skip SSR — the parent
// reserves a fixed square so there is no layout shift while it loads.
const Impl = dynamic(
  () => import("./confetti-hero-animation").then((m) => m.ConfettiHeroAnimation),
  { ssr: false, loading: () => null },
);

export function ConfettiHeroAnimation({ className }: { className?: string }) {
  return <Impl className={className} />;
}

export default ConfettiHeroAnimation;
