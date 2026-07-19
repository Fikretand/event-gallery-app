"use client";

import dynamic from "next/dynamic";

// The explainer carries a bespoke animation runtime plus two large scene
// modules (desktop + mobile). It only mounts once the section scrolls near
// view, so we code-split it out of the homepage's initial JS bundle and skip
// SSR entirely. A responsive placeholder reserves the frame (portrait on
// mobile, landscape on desktop — matching the explainer's own breakpoint) so
// there is no layout shift when it swaps in.
const ConfettiExplainerImpl = dynamic(
  () => import("./confetti-explainer").then((m) => m.ConfettiExplainer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[9/16] w-full rounded-[24px] bg-[#f2eadf] md:aspect-[16/10]" />
    ),
  },
);

export function ConfettiExplainer() {
  return <ConfettiExplainerImpl />;
}

export default ConfettiExplainer;
