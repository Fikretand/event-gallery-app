"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-segment error boundary — catches render/runtime errors below the root
// layout and shows a branded fallback instead of a raw crash.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in Vercel logs; a real monitor (Sentry) can hook in here later.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Confetti
        </p>
        <h1 className="font-display mt-4 text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
          Nešto je pošlo po zlu
        </h1>
        <p className="mt-2 font-display text-lg italic text-black/50">Something went wrong</p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-black/60">
          Došlo je do neočekivane greške. Pokušajte ponovo ili se vratite na početnu.
          <br />
          <span className="text-black/45">An unexpected error occurred. Please try again.</span>
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--color-ink)_85%,black)]"
          >
            Pokušaj ponovo · Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
          >
            Početna · Home
          </Link>
        </div>
      </div>
    </main>
  );
}
