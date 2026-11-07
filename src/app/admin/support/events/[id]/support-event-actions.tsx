"use client";

import { useState, useTransition } from "react";

import {
  adminDismissReportsAction,
  adminExtendGalleryAction,
  adminHideMediaAction,
  adminRetryProcessingAction,
  adminSetGuestUploadAction,
} from "@/lib/support-actions";

function useRun() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = (fn: () => Promise<string | void>) =>
    startTransition(async () => {
      setMessage(null);
      try {
        const text = await fn();
        if (text) setMessage({ tone: "ok", text });
      } catch (e) {
        setMessage({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." });
      }
    });
  return { pending, message, run };
}

function Message({ message }: { message: { tone: "ok" | "error"; text: string } | null }) {
  if (!message) return null;
  return (
    <span role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-error" : "text-moss"}`}>
      {message.text}
    </span>
  );
}

export function SupportFileRetry({ eventId, mediaId, label }: { eventId: string; mediaId?: string; label: string }) {
  const { pending, message, run } = useRun();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          run(async () => {
            const result = await adminRetryProcessingAction(eventId, mediaId ? [mediaId] : undefined);
            return `${result.ok} processed${result.failed ? `, ${result.failed} still failing` : ""}${result.more ? ", more left" : ""}.`;
          })
        }
        className="btn btn-sm btn-secondary"
      >
        {pending ? "Working…" : label}
      </button>
      <Message message={message} />
    </span>
  );
}

export function SupportReportActions({ eventId, mediaId, hidden }: { eventId: string; mediaId: string; hidden: boolean }) {
  const { pending, message, run } = useRun();
  return (
    <span className="flex flex-wrap items-center gap-2">
      {hidden ? null : (
        <button type="button" disabled={pending} onClick={() => run(() => adminHideMediaAction(eventId, mediaId))} className="btn btn-sm btn-danger-quiet">
          Hide file
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run(() => adminDismissReportsAction(eventId, mediaId))} className="btn btn-sm btn-quiet">
        Dismiss reports
      </button>
      <Message message={message} />
    </span>
  );
}

export function SupportEventActions({ eventId, guestUploadOn }: { eventId: string; guestUploadOn: boolean }) {
  const { pending, message, run } = useRun();
  return (
    <section aria-labelledby="fix-head" className="card space-y-4 p-5">
      <h2 id="fix-head" className="app-section-title text-ink">
        Fixes
      </h2>
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">Keep the gallery open longer</p>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <button key={days} type="button" disabled={pending} onClick={() => run(async () => (await adminExtendGalleryAction(eventId, days), `Extended by ${days} days.`))} className="btn btn-sm btn-secondary">
              +{days} days
            </button>
          ))}
        </div>
        <p className="meta">Counts from today or the current end, whichever is later. Guest uploads keep their own window.</p>
      </div>
      <div className="space-y-2 border-t border-rule pt-4">
        <p className="text-sm font-medium text-ink">Guest uploads</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(async () => (await adminSetGuestUploadAction(eventId, !guestUploadOn), guestUploadOn ? "Guest uploads are off." : "Guest uploads are on."))}
          className="btn btn-sm btn-secondary"
        >
          {guestUploadOn ? "Switch off" : "Switch on"}
        </button>
      </div>
      <Message message={message} />
    </section>
  );
}
