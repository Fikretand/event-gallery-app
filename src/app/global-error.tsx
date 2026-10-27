"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/error-screen";

import "./globals.css";

// Root error boundary — replaces the whole document if the root layout itself
// throws, so it renders its own <html>/<body> and imports the stylesheet
// itself (the root layout that normally brings it is the thing that failed).
// The fonts fall back to Georgia and the system sans.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Fatal app error:", error);
  }, [error]);

  return (
    <html lang="bs">
      <body>
        <ErrorScreen
          titleBs="Nešto je pošlo po zlu"
          titleEn="Something went wrong"
          bodyBs="Došlo je do neočekivane greške. Pokušajte ponovo."
          bodyEn="An unexpected error occurred. Please try again."
          actions={
            <button type="button" onClick={reset} className="btn btn-primary">
              Pokušaj ponovo (Try again)
            </button>
          }
        />
      </body>
    </html>
  );
}
