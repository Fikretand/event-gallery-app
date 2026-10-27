"use client";

import { useState } from "react";


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
}: {
  title: string;
  body?: string;
  url: string;
  copyLabel: string;
  copiedLabel: string;
  /** Kept for callers; both links now look the same, the section around each says what it is for. */
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

  // A field row, not a card: the label, the address in a read-only well and
  // the copy button.
  return (
    <div className="flex flex-col gap-2">
      <p className="field-label">{title}</p>
      {body ? <p className="text-sm leading-6 text-ink-2">{body}</p> : null}
      <div className="flex items-center gap-2">
        <p className="code min-h-10 min-w-0 flex-1 truncate rounded-[var(--radius-inner)] bg-paper-2 px-3 py-2.5 text-sm text-ink" title={url}>
          {url}
        </p>
        <button type="button" onClick={copy} aria-live="polite" className="btn btn-sm btn-secondary shrink-0">
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
