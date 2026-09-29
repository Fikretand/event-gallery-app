"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Three.js is heavy (~150 KB), and this loop only lives in the footer CTA far
// below the fold. Code-split it into its own chunk and skip SSR — the parent
// reserves a fixed square so there is no layout shift while it loads.
const Impl = dynamic(
  () => import("./confetti-hero-animation").then((m) => m.ConfettiHeroAnimation),
  { ssr: false, loading: () => null },
);

/**
 * Only fetch and start the 3D loop once the footer comes near the screen.
 * Rendering the dynamic component straight away downloaded Three.js, created
 * a WebGL context and compiled its shaders while the page was still loading —
 * the same moment the explainer above starts playing, which made it stutter.
 */
export function ConfettiHeroAnimation({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {near ? <Impl className="h-full w-full" /> : null}
    </div>
  );
}

export default ConfettiHeroAnimation;
