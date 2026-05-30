"use client";

import { useState } from "react";

import { POSTER_TEMPLATES, type PosterFormat, type PosterTemplate } from "@/lib/qr-posters";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to actually save before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface QrPosterPickerProps {
  slug: string;
  /** Plain QR code as a data:image/png;base64,... URL for the standalone download. */
  qrCodeDataUrl: string;
  /** Event title — used for default copy in the live previews. */
  eventTitle: string;
  /** Formatted event date (e.g. "14 . 06 . 26"). */
  eventDate: string | null;
}

type DownloadKey = `${PosterTemplate}-${PosterFormat}` | "plain";

export function QrPosterPicker({ slug, qrCodeDataUrl, eventTitle, eventDate }: QrPosterPickerProps) {
  const [busy, setBusy] = useState<DownloadKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadPoster(template: PosterTemplate, format: PosterFormat) {
    const key: DownloadKey = `${template}-${format}`;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/qr-poster?template=${template}&format=${format}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Download failed.");
      }
      const blob = await res.blob();
      triggerDownload(blob, `confetti-${slug}-${template}.${format}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  function downloadPlain() {
    setBusy("plain");
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
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Plain QR download button */}
      <button
        type="button"
        onClick={downloadPlain}
        disabled={busy !== null}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {busy === "plain" ? "Pripremam…" : "Skini QR (PNG)"}
      </button>

      {/* Template gallery — horizontal scroll */}
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
              Printable templates
            </p>
            <p className="mt-1 text-xs leading-5 text-black/55">
              Skroluj lijevo / desno · A4 300 DPI
            </p>
          </div>
          <span className="text-[11px] text-black/35">← swipe →</span>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          className="mt-4 -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3"
          style={{ scrollbarWidth: "thin" }}
        >
          {POSTER_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-black/8 bg-white/95"
            >
              <TemplatePreview
                template={tmpl.id}
                qrCodeDataUrl={qrCodeDataUrl}
                eventTitle={eventTitle}
                eventDate={eventDate}
              />
              <div className="flex flex-1 flex-col gap-2.5 px-3 py-3">
                <p className="text-xs font-semibold leading-tight text-[var(--color-ink)]">
                  {tmpl.name}
                </p>
                <div className="mt-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => downloadPoster(tmpl.id, "png")}
                    disabled={busy !== null}
                    className="flex-1 rounded-full bg-[var(--color-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy === `${tmpl.id}-png` ? "…" : "PNG"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPoster(tmpl.id, "pdf")}
                    disabled={busy !== null}
                    className="flex-1 rounded-full border border-[var(--color-ink)]/15 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy === `${tmpl.id}-pdf` ? "…" : "PDF"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live HTML preview — visually mirrors the printed SVG. Coordinates roughly
// correspond to the 1240×1754 viewBox, scaled down to fit a card.
// ─────────────────────────────────────────────────────────────────────────────
function TemplatePreview({
  template,
  qrCodeDataUrl,
  eventTitle,
  eventDate,
}: {
  template: PosterTemplate;
  qrCodeDataUrl: string;
  eventTitle: string;
  eventDate: string | null;
}) {
  switch (template) {
    case "minimal-cream":
      return <PreviewMinimal qr={qrCodeDataUrl} title={eventTitle} />;
    case "confetti-burst":
      return <PreviewConfettiBurst qr={qrCodeDataUrl} title={eventTitle} />;
    case "polaroid":
      return <PreviewPolaroid qr={qrCodeDataUrl} title={eventTitle} date={eventDate} />;
    case "editorial":
      return <PreviewEditorial qr={qrCodeDataUrl} title={eventTitle} date={eventDate} />;
    default:
      return null;
  }
}

function PreviewShell({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      className="relative aspect-[1240/1754] w-full"
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}

function PreviewMinimal({ qr, title }: { qr: string; title: string }) {
  return (
    <PreviewShell bg="#fffaf2">
      <div className="absolute inset-0 flex flex-col items-center px-6 pt-[14%]">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#38584d]">Dobrodošli na</p>
        <p
          className="mt-3 truncate text-center text-[18px] font-semibold italic text-[#172033]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {title}
        </p>
        <span className="mt-2 h-[2px] w-10 bg-[#e27952]" />
        <div className="mt-4 rounded-lg border border-black/5 bg-[#fbf7f1] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="h-16 w-16" />
        </div>
        <p
          className="mt-3 text-center text-[10px] text-[#172033]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Skeniraj telefonom i ostavi
          <br />
          <em className="italic text-[#e27952]">svoje fotke sa današnjeg dana.</em>
        </p>
      </div>
    </PreviewShell>
  );
}

function PreviewConfettiBurst({ qr, title }: { qr: string; title: string }) {
  return (
    <PreviewShell bg="#fffaf2">
      <div className="absolute inset-x-0 top-0 h-[25%] bg-[#e27952]">
        <div className="flex h-full flex-col items-center justify-center px-4">
          <p className="text-[9px] uppercase tracking-[0.4em] text-white/90">Privatna galerija</p>
          <p
            className="mt-1 truncate text-center text-[18px] font-semibold italic text-white"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {title}
          </p>
        </div>
      </div>
      {/* confetti specks */}
      <span className="absolute left-[12%] top-[34%] h-2 w-2 rounded-full bg-[#f0c25c]" />
      <span className="absolute right-[14%] top-[30%] h-1.5 w-3 rotate-45 bg-[#38584d]" />
      <span className="absolute left-[18%] top-[78%] h-2 w-2 rounded-full bg-[#e27952]" />
      <span className="absolute right-[20%] top-[74%] h-1.5 w-3 -rotate-12 bg-[#f0c25c]" />
      <div className="absolute inset-x-0 top-[36%] flex justify-center">
        <div className="rounded-xl border border-black/5 bg-[#fbf7f1] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="h-20 w-20" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[10%] text-center">
        <p className="text-[11px] text-[#172033]" style={{ fontFamily: "Georgia, serif" }}>
          Sve sa večeri —
          <br />
          <em className="italic text-[#e27952]">na jednom mjestu.</em>
        </p>
      </div>
    </PreviewShell>
  );
}

function PreviewPolaroid({ qr, title, date }: { qr: string; title: string; date: string | null }) {
  return (
    <PreviewShell bg="#f2eadf">
      <p className="absolute inset-x-0 top-[8%] text-center text-[9px] uppercase tracking-[0.4em] text-[#38584d]">
        Skeniraj i podijeli
      </p>
      <div className="absolute inset-x-[18%] top-[18%] rounded-md bg-white p-2 pb-5 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
        <div className="bg-[#fbf7f1] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="aspect-square w-full" />
        </div>
        <p
          className="mt-2 truncate text-center text-[14px] font-semibold italic text-[#172033]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {title}
        </p>
        {date && (
          <p className="text-center text-[8px] uppercase tracking-[0.3em] text-[#3a4258]">{date}</p>
        )}
      </div>
      <p
        className="absolute inset-x-0 bottom-[8%] text-center text-[11px] text-[#172033]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Uslikaj. <em className="italic text-[#e27952]">Dijeli.</em> Sjećaj se.
      </p>
    </PreviewShell>
  );
}

function PreviewEditorial({ qr, title, date }: { qr: string; title: string; date: string | null }) {
  return (
    <PreviewShell bg="#fffaf2">
      <div className="absolute inset-x-[10%] top-[7%] h-[2px] bg-[#38584d]" />
      <p className="absolute inset-x-0 top-[10%] text-center text-[8px] uppercase tracking-[0.4em] text-[#38584d]">
        {date ? `Privatna galerija · ${date}` : "Privatna galerija"}
      </p>
      <p
        className="absolute inset-x-0 top-[22%] truncate text-center text-[22px] font-bold italic text-[#172033]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {title}
      </p>
      <span className="absolute left-1/2 top-[31%] h-[1.5px] w-8 -translate-x-1/2 bg-[#e27952]" />
      <div className="absolute inset-x-0 top-[38%] flex justify-center">
        <div className="border border-[#38584d]/30 bg-[#fbf7f1] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="h-20 w-20" />
        </div>
      </div>
      <p
        className="absolute inset-x-0 bottom-[12%] text-center text-[11px] text-[#172033]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Skeniraj da podijeliš
        <br />
        <em className="italic text-[#e27952]">svoje trenutke s nama.</em>
      </p>
      <div className="absolute inset-x-[10%] bottom-[6%] h-px bg-[#38584d]" />
    </PreviewShell>
  );
}
