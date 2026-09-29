"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * One of the event's two public links, with what it is for and a copy button.
 *
 * Owners were shown two bare URLs under near-identical labels and had to guess
 * which one goes on the tables and which one goes to the client after the
 * event. Each card now says so in a sentence.
 */
export function EventLinkCard({
  title,
  body,
  url,
  copyLabel,
  copiedLabel,
  accent = false,
}: {
  title: string;
  body: string;
  url: string;
  copyLabel: string;
  copiedLabel: string;
  /** The guest/QR link is the one used on the day; give it the warmer treatment. */
  accent?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be refused (permissions, insecure context); the URL is
      // still on screen to copy by hand, so there is nothing more to do.
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-[24px] border p-4",
        accent ? "border-[var(--color-accent)]/25 bg-[#fff6f1]" : "border-black/10 bg-white",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/60">{body}</p>
      <div className="mt-3 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate rounded-xl bg-[var(--color-paper)]/70 px-3 py-2 font-mono text-xs text-[var(--color-ink)]" title={url}>
          {url}
        </p>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
