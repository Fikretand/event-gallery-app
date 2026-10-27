"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorScreen } from "@/components/error-screen";

// Route-segment error boundary — catches render/runtime errors below the root
// layout and shows a branded fallback instead of a raw crash.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in Vercel logs; a real monitor (Sentry) can hook in here later.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <ErrorScreen
      titleBs="Nešto je pošlo po zlu"
      titleEn="Something went wrong"
      bodyBs="Došlo je do neočekivane greške. Pokušajte ponovo ili se vratite na početnu."
      bodyEn="An unexpected error occurred. Please try again."
      actions={
        <>
          <button type="button" onClick={reset} className="btn btn-primary">
            Pokušaj ponovo (Try again)
          </button>
          <Link href="/" className="btn btn-secondary">
            Početna (Home)
          </Link>
        </>
      }
    />
  );
}
