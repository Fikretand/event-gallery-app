"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/ui/icons";

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
          className="btn btn-sm btn-secondary"
        >
          <DownloadIcon className="h-4 w-4" />
          {busy ? s.plainPreparing : s.plainDownload}
        </button>
        {editorHref && (
          <a
            href={editorHref}
            className="btn btn-sm btn-primary"
          >
            {s.customize}
          </a>
        )}
      </div>

      {editorHref && (
        <p className="meta">{s.customizeHint}</p>
      )}
    </div>
  );
}
