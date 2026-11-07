"use client";

import { useState, useTransition } from "react";

import { adminRecoveryLinkAction } from "@/lib/support-actions";

/**
 * For a customer who cannot sign in and whose reset mail did not arrive: a
 * one-time link the admin sends them by hand (WhatsApp, mail).
 */
export function UserSupportTools({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-card">
      <div className="border-b border-rule px-5 py-3.5">
        <p className="text-xs font-semibold text-muted">Sign-in help</p>
      </div>
      <div className="space-y-3 px-5 py-5">
        <p className="text-sm text-ink-2">
          Makes a one-time password reset link for this account. Send it to the customer; do not open it yourself, it signs in as them.
        </p>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setCopied(false);
              try {
                setLink(await adminRecoveryLinkAction(userId));
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong.");
              }
            })
          }
          className="btn btn-sm btn-secondary"
        >
          {pending ? "Making link…" : "Make reset link"}
        </button>
        {link ? (
          <div className="space-y-2">
            <label htmlFor="recovery-link" className="field-label">
              Reset link (one use, expires in about an hour)
            </label>
            <input id="recovery-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="field code text-xs" />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true), () => setCopied(false))}
              className="btn btn-sm btn-quiet"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
