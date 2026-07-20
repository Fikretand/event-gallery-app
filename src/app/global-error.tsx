"use client";

import { useEffect } from "react";

// Root error boundary — replaces the whole document if the root layout itself
// throws, so it must render its own <html>/<body> and cannot rely on the app's
// stylesheet or fonts. Styles are inlined with the brand palette.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Fatal app error:", error);
  }, [error]);

  return (
    <html lang="bs">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background:
            "radial-gradient(circle at top left, rgba(226,121,82,0.14), transparent 30%), linear-gradient(180deg, #fffaf4 0%, #f3ede4 100%)",
          color: "#172033",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "#e27952" }}>
            Confetti
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, margin: "16px 0 4px", fontWeight: 600 }}>
            Nešto je pošlo po zlu
          </h1>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, color: "rgba(23,32,51,0.5)", margin: 0 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(23,32,51,0.6)", marginTop: 16 }}>
            Došlo je do neočekivane greške. Pokušajte ponovo.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              background: "#172033",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              padding: "12px 24px",
            }}
          >
            Pokušaj ponovo · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
