"use client";

import { useState } from "react";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface QrPosterPickerStrings {
  plainDownload: string;
  plainPreparing: string;
  customize: string;
  customizeHint: string;
}

const DEFAULT_STRINGS: QrPosterPickerStrings = {
  plainDownload: "Download QR (PNG)",
  plainPreparing: "Preparing…",
  customize: "Customize ✎",
  customizeHint:
    "Click Customize to start from one of 4 templates and edit names, fonts, colours, or add your own image.",
};

interface QrPosterPickerProps {
  slug: string;
  /** Plain QR code as a data:image/png;base64,... URL for the standalone download. */
  qrCodeDataUrl: string;
  /** Optional translations. Defaults to English. */
  strings?: QrPosterPickerStrings;
  /** When provided, renders a "Customize" link to the Fabric.js card editor. */
  editorHref?: string;
}

export function QrPosterPicker({
  slug,
  qrCodeDataUrl,
  strings,
  editorHref,
}: QrPosterPickerProps) {
  const s = strings ?? DEFAULT_STRINGS;
  const [busy, setBusy] = useState(false);

  function downloadPlain() {
    setBusy(true);
    try {
      // qrCodeDataUrl is "data:image/png;base64,..."; convert to a Blob for the
      // anchor download trick (saves a HTTP round-trip).
      const [meta, b64] = qrCodeDataUrl.split(",");
      const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      triggerDownload(blob, `confetti-${slug}-qr.png`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={downloadPlain}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {busy ? s.plainPreparing : s.plainDownload}
        </button>
        {editorHref && (
          <a
            href={editorHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
          >
            {s.customize}
          </a>
        )}
      </div>

      {editorHref && (
        <p className="text-xs leading-5 text-black/55">{s.customizeHint}</p>
      )}
    </div>
  );
}
