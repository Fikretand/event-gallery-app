"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Dict } from "@/lib/i18n/index";
import { CARD_PRESETS } from "@/lib/qr-card-editor/presets";
import {
  downloadCardPdf,
  readDraft,
  renderCardImage,
  triggerDownload,
  type CardContext,
} from "@/lib/qr-card-editor/render";

type Strings = Dict["dashboard"]["qrCard"]["page"];

/**
 * The card as it stands — the draft saved on this device, or the first
 * template — with downloads, the other templates, and the way into the editor.
 * Drafts live in this browser's storage, so another device shows the template.
 */
export function QrCardOverview({
  slug,
  card,
  plainQrDataUrl,
  uploadUrl,
  editorHref,
  strings: s,
  qrHint,
}: {
  slug: string;
  card: CardContext;
  plainQrDataUrl: string;
  uploadUrl: string;
  editorHref: string;
  strings: Strings;
  qrHint: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = readDraft(slug);
      if (!cancelled) setHasDraft(Boolean(draft));
      try {
        const url = await renderCardImage(draft ? { json: draft.canvas } : { preset: CARD_PRESETS[0] }, card, 0.6);
        if (!cancelled) setPreview(url);
      } catch {
        if (!cancelled) setFailed(true);
      }
      for (const preset of CARD_PRESETS) {
        if (cancelled) return;
        try {
          const url = await renderCardImage({ preset }, card, 0.16);
          if (!cancelled) setThumbs((current) => ({ ...current, [preset.id]: url }));
        } catch {
          // The name alone still works as a choice.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Rendered once per visit; the card's inputs do not change on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function download(kind: "pdf" | "png") {
    setFailed(false);
    setBusy(kind);
    try {
      const draft = readDraft(slug);
      const full = await renderCardImage(draft ? { json: draft.canvas } : { preset: CARD_PRESETS[0] }, card, 2);
      if (kind === "png") triggerDownload(full, `confetti-${slug}-kartica.png`);
      else await downloadCardPdf(full, `confetti-${slug}-kartica.pdf`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  function openTemplate(id: string) {
    if (hasDraft && !window.confirm(s.replaceConfirm)) return;
    router.push(`${editorHref}?template=${encodeURIComponent(id)}`);
  }

  const secondary =
    "btn btn-sm btn-secondary";

  return (
    <>
      <section className="border-t border-rule pt-[var(--space-lg)] first:border-t-0 first:pt-0">
        <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-start">
          <div className="mx-auto w-full max-w-[260px]">
            <div className="aspect-[1240/1754] overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-paper-2">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={s.yourCard} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">{s.loading}</div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="app-section-title text-ink">{s.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">{s.body}</p>
            <p className="mt-4 rounded-[var(--radius-inner)] bg-paper-2/65 px-4 py-3 text-sm leading-6 text-ink-2">
              <span className="font-semibold text-ink">{s.yourCard}: </span>
              {hasDraft ? s.draftNote : s.defaultNote}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href={editorHref}
                className="btn btn-sm btn-primary"
              >
                {s.edit}
              </Link>
              <button type="button" onClick={() => void download("pdf")} disabled={busy !== null} className={secondary}>
                {busy === "pdf" ? s.preparing : s.downloadPdf}
              </button>
              <button type="button" onClick={() => void download("png")} disabled={busy !== null} className={secondary}>
                {busy === "png" ? s.preparing : s.downloadPng}
              </button>
            </div>
            {failed ? <p className="mt-3 text-sm text-error">{s.failed}</p> : null}
            <p className="mt-4 text-sm leading-6 text-ink-2">{qrHint}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-rule pt-[var(--space-lg)] first:border-t-0 first:pt-0">
        <h3 className="app-section-title text-ink">{s.templatesTitle}</h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-2">{s.templatesBody}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {CARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => openTemplate(preset.id)}
              className="group text-left"
            >
              <span className="block aspect-[1240/1754] overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-paper-2 transition-colors duration-[var(--dur-micro)] group-hover:border-ink-2">
                {thumbs[preset.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[preset.id]} alt="" className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-sm font-medium text-ink-2">{preset.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-rule pt-[var(--space-lg)] first:border-t-0 first:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plainQrDataUrl} alt="" className="h-28 w-28 shrink-0 rounded-[var(--radius-inner)] border border-rule bg-card p-1.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">{s.plainQr}</h3>
            <p className="mt-1 text-sm leading-6 text-ink-2">{s.plainQrBody}</p>
            <p className="mt-1 truncate font-mono text-xs text-muted">{uploadUrl}</p>
            <button
              type="button"
              onClick={() => triggerDownload(plainQrDataUrl, `confetti-${slug}-qr.png`)}
              className={`${secondary} mt-3`}
            >
              {s.downloadPng}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
