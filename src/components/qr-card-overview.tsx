"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Panel } from "@/components/ui/panel";
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
    "inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)] disabled:opacity-60";

  return (
    <>
      <Panel className="bg-white/90">
        <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-start">
          <div className="mx-auto w-full max-w-[260px]">
            <div className="aspect-[1240/1754] overflow-hidden rounded-[18px] border border-black/10 bg-[var(--color-paper)] shadow-[0_18px_50px_rgba(18,24,38,0.14)]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={s.yourCard} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-black/45">{s.loading}</div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-3xl font-semibold text-[var(--color-ink)]">{s.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/62">{s.body}</p>
            <p className="mt-4 rounded-[18px] bg-[var(--color-paper)]/65 px-4 py-3 text-sm leading-6 text-black/60">
              <span className="font-semibold text-[var(--color-ink)]">{s.yourCard}: </span>
              {hasDraft ? s.draftNote : s.defaultNote}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href={editorHref}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(226,121,82,0.3)] transition hover:brightness-105"
              >
                ✎ {s.edit}
              </Link>
              <button type="button" onClick={() => void download("pdf")} disabled={busy !== null} className={secondary}>
                {busy === "pdf" ? s.preparing : s.downloadPdf}
              </button>
              <button type="button" onClick={() => void download("png")} disabled={busy !== null} className={secondary}>
                {busy === "png" ? s.preparing : s.downloadPng}
              </button>
            </div>
            {failed ? <p className="mt-3 text-sm text-[#8a1c1c]">{s.failed}</p> : null}
            <p className="mt-4 text-sm leading-6 text-black/55">{qrHint}</p>
          </div>
        </div>
      </Panel>

      <Panel className="bg-white/90">
        <h3 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{s.templatesTitle}</h3>
        <p className="mt-1.5 text-sm leading-6 text-black/60">{s.templatesBody}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {CARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => openTemplate(preset.id)}
              className="group text-left"
            >
              <span className="block aspect-[1240/1754] overflow-hidden rounded-xl border border-black/10 bg-[var(--color-paper)] shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                {thumbs[preset.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[preset.id]} alt="" className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-xs font-medium text-black/65">{preset.name}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="bg-white/90">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plainQrDataUrl} alt="" className="h-28 w-28 shrink-0 rounded-xl border border-black/10 bg-white p-1.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--color-ink)]">{s.plainQr}</h3>
            <p className="mt-1 text-sm leading-6 text-black/60">{s.plainQrBody}</p>
            <p className="mt-1 truncate font-mono text-xs text-black/45">{uploadUrl}</p>
            <button
              type="button"
              onClick={() => triggerDownload(plainQrDataUrl, `confetti-${slug}-qr.png`)}
              className={`${secondary} mt-3`}
            >
              {s.downloadPng}
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}
