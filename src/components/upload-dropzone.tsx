"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { AccountType } from "@/lib/types";
import type { Dict } from "@/lib/i18n/index";
import { fileFingerprint, readSentFingerprints, rememberSentFingerprints, splitAlreadySent } from "@/lib/upload-dedupe";
import { extractVideoThumbnail, NETWORK_ERROR, RETRY, uploadFile } from "@/lib/upload-client";
import { RetryableUploadError, isRetryableStatus, runPool, uploadConcurrency, withRetry } from "@/lib/upload-queue";
import { cn, formatBytes } from "@/lib/utils";

type UploadStatusValue =
  | "queued"
  | "requesting"
  | "uploading"
  | "waiting"
  | "retrying"
  | "confirming"
  | "done"
  | "error";

type UploadItem = {
  id: string;
  file: File;
  status: UploadStatusValue;
  progress: number;
  message?: string;
};

type UploadTarget = "guest" | "photographer";

type Props = {
  endpoint: string;
  target: UploadTarget;
  allowVideo: boolean;
  pinRequired: boolean;
  audience?: AccountType;
  /** Optional i18n strings — when omitted, English is used */
  strings?: Partial<Dict["uploadDropzone"]>;
  /** Shown beside "upload more" once everything has arrived — the next thing to press. */
  nextLink?: { href: string; label: string };
};

type ApiErrorCode = keyof Dict["uploadDropzone"]["apiErrors"];

/** `{{name}}` interpolation, local so the dictionary helpers stay out of the client bundle. */
function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

type Grant = {
  objectKey: string;
  uploadUrl: string;
  contentType: string;
  originalFilename: string;
  size: number;
  sourceType: UploadTarget;
  confirmToken: string;
  thumbnailObjectKey?: string;
  thumbnailUploadUrl?: string;
  thumbnailConfirmToken?: string;
};

// Confetti burst particles (defined outside component — stable reference)
const CONFETTI_PIECES = [
  { color: "#e27952", x: 8,  y: 25, delay: 0,    w: 8,  h: 6  },
  { color: "#f6d3c3", x: 20, y: 15, delay: 0.06, w: 6,  h: 10 },
  { color: "#38584d", x: 35, y: 30, delay: 0.12, w: 8,  h: 8  },
  { color: "#f9c74f", x: 50, y: 10, delay: 0.04, w: 10, h: 6  },
  { color: "#90e0ef", x: 65, y: 20, delay: 0.18, w: 6,  h: 8  },
  { color: "#e27952", x: 78, y: 28, delay: 0.08, w: 8,  h: 6  },
  { color: "#a8dadc", x: 90, y: 12, delay: 0.14, w: 6,  h: 10 },
  { color: "#f72585", x: 15, y: 40, delay: 0.02, w: 10, h: 6  },
  { color: "#38584d", x: 45, y: 35, delay: 0.16, w: 6,  h: 8  },
  { color: "#f9c74f", x: 60, y: 18, delay: 0.1,  w: 8,  h: 6  },
  { color: "#f6d3c3", x: 82, y: 38, delay: 0.2,  w: 6,  h: 10 },
  { color: "#e27952", x: 30, y: 8,  delay: 0.07, w: 8,  h: 8  },
];


function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

function itemId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Thumbnails of what was just sent, shown on this device only. */
type SentPreview = { id: string; url: string; isVideo: boolean };
const SENT_PREVIEW_LIMIT = 24;

export function UploadDropzone({ endpoint, target, allowVideo, pinRequired, audience = "photographer", strings, nextLink }: Props) {
  const router = useRouter();
  const [guestName, setGuestName]   = useState("");
  const [pin, setPin]               = useState("");
  const [items, setItems]           = useState<UploadItem[]>([]);
  const [success, setSuccess]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Picked files this device already sent to this event, held back until the
  // guest says "send anyway". The thumbnails of what was sent stay for the
  // whole visit (bounded by SENT_PREVIEW_LIMIT) and are released on leaving.
  const [skipped, setSkipped]       = useState<File[]>([]);
  const [sentPreviews, setSentPreviews] = useState<SentPreview[]>([]);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // ─── Resolved i18n strings (fall back to English) ─────────────────────────
  const s = useMemo(() => ({
    stepChoose: strings?.stepChoose ?? "Choose",
    stepReview: strings?.stepReview ?? "Review",
    stepSend:   strings?.stepSend   ?? "Send",
    chooseTitle:    strings?.chooseTitle    ?? (target === "guest" ? "Share your photos" : audience === "couple" ? "Upload your gallery files" : "Upload final gallery files"),
    chooseSubtitle: strings?.chooseSubtitle ?? (target === "guest" ? "Tap the big button below to choose photos from your phone. It only takes a moment!" : audience === "couple" ? "Choose the photos and videos you want to keep in this private event space." : "Choose the finished photos and videos, then upload them to the pro gallery."),
    selectPhotosBtn: strings?.selectPhotosBtn ?? (target === "guest" ? "Choose Photos" : "Add Files"),
    sendBtn:        strings?.sendBtn        ?? (target === "guest" ? "Send Photos" : audience === "couple" ? "Upload to Gallery" : "Upload Files"),
    reviewTitle:    strings?.reviewTitle    ?? (target === "guest" ? "Ready to send" : "Review before uploading"),
    uploadingTitle: strings?.uploadingTitle ?? "Sending your photos…",
    successTitle:   strings?.successTitle   ?? "Photos sent! 🎉",
    successBody:    strings?.successBody    ?? (target === "guest" ? "Your photos are safely saved! The event host will see them soon." : audience === "couple" ? "Upload complete. Your files are now in the private gallery." : "Upload complete. Your files are now in the pro gallery."),
    uploadAnotherBtn: strings?.uploadAnotherBtn ?? "Upload more photos",
    addMoreBtn:     strings?.addMoreBtn     ?? "Add more",
    retryBtn:       strings?.retryBtn       ?? "Retry",
    nameLabel:      strings?.nameLabel      ?? "Your name",
    emailLabel:     strings?.emailLabel     ?? "Email",
    pinLabel:       strings?.pinLabel       ?? "Event PIN",
    namePlaceholder:  strings?.namePlaceholder  ?? "e.g. Ana Kovač",
    emailPlaceholder: strings?.emailPlaceholder ?? "ana@example.com",
    pinPlaceholder:   strings?.pinPlaceholder   ?? "Enter the PIN from your host",
    orClickSelect:    strings?.orClickSelect    ?? "or tap to browse",
    partialLabel:   strings?.partialBody ?? "Some photos were sent, but a few didn't go through. Send them again with the button below.",
    successNext:    strings?.successNext ?? (target === "guest" ? "The host reviews them before they appear in the gallery. Got more? Send them now." : ""),
    optional:       strings?.optional ?? "(optional)",
    required:       strings?.required ?? "required",
    noAccountNeeded: strings?.noAccountNeeded ?? (target === "guest" ? "No app, no account needed" : "Originals are kept at full quality"),
    selectedCount:  strings?.selectedCount ?? "{{count}} selected",
    totalSize:      strings?.totalSize ?? "{{size}} total",
    clearAll:       strings?.clearAll ?? "Clear all",
    removeFile:     strings?.removeFile ?? "Remove file",
    retryFailed:    strings?.retryFailed ?? "↺ Retry failed ({{count}})",
    keepPageOpen:   strings?.keepPageOpen ?? "Please keep this page open until it finishes",
    progress:       strings?.progress ?? "{{done}} of {{total}} sent",
    tryAgain:       strings?.tryAgain ?? "Try again →",
    duplicatesSkipped: strings?.duplicatesSkipped ?? "{{count}} already sent from this phone – skipped.",
    sendAnyway:     strings?.sendAnyway ?? "Send anyway",
    sentTitle:      strings?.sentTitle ?? "Just sent",
    sentPendingNote: strings?.sentPendingNote ?? "Only you can see these until the host approves them.",
    statuses: strings?.statuses ?? {
      queued: "Waiting", requesting: "Preparing", uploading: "Uploading",
      waiting: "Waiting for internet", retrying: "Trying again",
      confirming: "Saving", done: "Done", error: "Failed",
    },
    errFilesRequired: strings?.errFilesRequired ?? "Add at least one file before sending.",
    errPinRequired: strings?.errPinRequired ?? "Please enter the upload PIN.",
    errNetwork: strings?.errNetwork ?? "The connection dropped during the upload. Check your internet and try again.",
    errStart:   strings?.errStart ?? "The upload couldn't start. Please try again.",
    errUpload:  strings?.errUpload ?? "The upload failed. Please try again.",
    apiErrors: strings?.apiErrors,
  }), [strings, target, audience]);

  function statusLabel(status: UploadStatusValue) {
    return s.statuses[status as keyof typeof s.statuses] ?? status;
  }

  /** The routes answer with a `code` next to their English `error`; prefer the translation. */
  function startErrorText(payload: { error?: string; code?: string }) {
    const translated = payload.code ? s.apiErrors?.[payload.code as ApiErrorCode] : undefined;
    return translated ?? payload.error ?? s.errStart;
  }

  /** Per-file failures: say whether it was the connection, never show raw status text. */
  function itemErrorText(error: unknown) {
    if (error instanceof TypeError) return s.errNetwork; // fetch() could not reach the server
    if (error instanceof RetryableUploadError) return s.errNetwork;
    if (error instanceof Error && error.message === NETWORK_ERROR) return s.errNetwork;
    return s.errUpload;
  }

  // ─── Derived copy strings (keep for backward compat) ─────────────────────
  const copy = useMemo(
    () => ({
      successLabel: s.successBody,
      partialLabel: s.partialLabel,
    }),
    [s],
  );

  // ─── Accepted file types ───────────────────────────────────────────────────
  // HEIC is left out on purpose. iPhones shoot HEIC, and iOS hands the page a
  // JPEG instead when the page does not ask for HEIC. Our image pipeline (sharp
  // without an HEVC decoder) cannot read HEIC, and most browsers cannot show it.
  const accept = useMemo(() => {
    const base = ["image/jpeg", "image/png", ".jpg", ".jpeg", ".png"];
    return allowVideo ? [...base, "video/mp4", "video/quicktime", ".mp4", ".mov"].join(",") : base.join(",");
  }, [allowVideo]);

  // ─── Derived counts ────────────────────────────────────────────────────────
  const totalSize      = items.reduce((sum, item) => sum + item.file.size, 0);
  const completedCount = items.filter((item) => item.status === "done").length;
  const failedCount    = items.filter((item) => item.status === "error").length;
  const activeItems    = items.filter((item) => item.status !== "done");

  // ─── Derived UI phase ─────────────────────────────────────────────────────
  // "choose"   → no files selected yet (or after clearing)
  // "review"   → files selected, ready to send (or partial failure)
  // "uploading"→ upload in progress
  // "success"  → all done, items cleared
  const phase: "choose" | "review" | "uploading" | "success" =
    isPending                        ? "uploading"
    : success && items.length === 0  ? "success"
    : items.length > 0               ? "review"
    :                                  "choose";

  const activeStep = phase === "choose" ? 0 : phase === "review" ? 1 : 2;
  const STEPS = [s.stepChoose, s.stepReview, s.stepSend] as const;

  // ─── State helpers ─────────────────────────────────────────────────────────
  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function mergeFiles(picked: File[], { allowRepeats = false } = {}) {
    const { fresh, duplicates } = allowRepeats
      ? { fresh: picked, duplicates: [] as File[] }
      : splitAlreadySent(picked, readSentFingerprints(endpoint));
    setSkipped(duplicates);
    const nextFiles = fresh;
    setItems((current) => {
      const merged = [...current];
      for (const file of nextFiles) {
        const id = itemId(file);
        if (!merged.some((existing) => existing.id === id)) {
          merged.push({ id, file, status: "queued", progress: 0 });
        }
      }
      return merged;
    });
  }

  async function uploadItems(targetItems: UploadItem[]) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      let uploadedAny = false;
      let failedAny = false;
      const sentNow: File[] = [];

      try {
        targetItems.forEach((item) => updateItem(item.id, { status: "requesting", progress: 0, message: undefined }));

        const payload = await withRetry(async () => {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              guestName:  guestName  || undefined,
              pin:        pin        || undefined,
              files: targetItems.map((item) => ({
                name: item.file.name,
                size: item.file.size,
                type: item.file.type,
              })),
            }),
          });

          // A gateway timeout answers in HTML; treat an unreadable body as "no details".
          const body = await response.json().catch(() => ({}));
          if (isRetryableStatus(response.status)) throw new RetryableUploadError(startErrorText(body));
          if (!response.ok) throw new Error(startErrorText(body));
          return body;
        }, RETRY);

        const grants = payload.grants as Grant[];

        // Several files at once; each one retries on its own, so a blip on one
        // file never stops the rest.
        await runPool(grants, uploadConcurrency(isTouchDevice()), async (grant, index) => {
          const currentItem = targetItems[index];

          updateItem(currentItem.id, { status: "uploading", progress: 0, message: undefined });

          const retryStatus = () => {
            updateItem(currentItem.id, {
              status: typeof navigator !== "undefined" && !navigator.onLine ? "waiting" : "retrying",
              progress: 0,
            });
          };

          try {
            await withRetry(
              () => {
                updateItem(currentItem.id, { status: "uploading" });
                return uploadFile(grant.uploadUrl, currentItem.file, (progress) => {
                  updateItem(currentItem.id, { progress });
                });
              },
              { ...RETRY, onRetry: retryStatus },
            );

            updateItem(currentItem.id, { status: "confirming", progress: 100 });

            // Videos: extract a poster frame and upload it to the presigned
            // thumbnail slot. Best-effort — failures leave the video without a
            // thumbnail rather than blocking the upload.
            let thumbnailKey: string | undefined;
            let thumbnailConfirmToken: string | undefined;
            if (grant.thumbnailUploadUrl && grant.contentType.startsWith("video/")) {
              const posterBlob = await extractVideoThumbnail(currentItem.file);
              if (posterBlob) {
                try {
                  const putResponse = await fetch(grant.thumbnailUploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "image/jpeg" },
                    body: posterBlob,
                  });
                  if (putResponse.ok) {
                    thumbnailKey = grant.thumbnailObjectKey;
                    thumbnailConfirmToken = grant.thumbnailConfirmToken;
                  }
                } catch {
                  // ignore — proceed without a thumbnail
                }
              }
            }

            // Safe to repeat: the server answers a second confirm of the same
            // object with the row it already made.
            await withRetry(
              async () => {
                const confirmResponse = await fetch("/api/uploads/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    eventId:         payload.eventId,
                    objectKey:       grant.objectKey,
                    originalFilename: grant.originalFilename,
                    mimeType:        grant.contentType,
                    sizeBytes:       grant.size,
                    sourceType:      grant.sourceType,
                    uploadSessionId: payload.uploadSessionId ?? null,
                    confirmToken:    grant.confirmToken,
                    thumbnailKey,
                    thumbnailConfirmToken,
                  }),
                });

                const confirmPayload = await confirmResponse.json().catch(() => ({}));
                if (isRetryableStatus(confirmResponse.status)) {
                  throw new RetryableUploadError(confirmPayload.error ?? `Failed to confirm ${currentItem.file.name}.`);
                }
                if (!confirmResponse.ok) {
                  throw new Error(confirmPayload.error ?? `Failed to confirm ${currentItem.file.name}.`);
                }
              },
              { ...RETRY, onRetry: retryStatus },
            );

            uploadedAny = true;
            sentNow.push(currentItem.file);
            updateItem(currentItem.id, { status: "done", progress: 100, message: undefined });
          } catch (itemError) {
            failedAny = true;
            updateItem(currentItem.id, { status: "error", message: itemErrorText(itemError) });
          }
        });

        setItems((current) => current.filter((item) => item.status !== "done"));
        if (inputRef.current) inputRef.current.value = "";

        if (sentNow.length > 0) {
          rememberSentFingerprints(endpoint, sentNow.map(fileFingerprint));
          const fresh = sentNow.slice(-SENT_PREVIEW_LIMIT).map((file) => {
            const url = URL.createObjectURL(file);
            previewUrls.current.push(url);
            return { id: itemId(file), url, isVideo: file.type.startsWith("video") };
          });
          setSentPreviews((current) => {
            const next = [...current, ...fresh];
            // Release what falls off the end so a long evening of uploads stays light.
            for (const old of next.slice(0, Math.max(0, next.length - SENT_PREVIEW_LIMIT))) {
              URL.revokeObjectURL(old.url);
              previewUrls.current = previewUrls.current.filter((url) => url !== old.url);
            }
            return next.slice(-SENT_PREVIEW_LIMIT);
          });
        }

        if (uploadedAny && !failedAny) {
          setSuccess(copy.successLabel);
        } else if (uploadedAny) {
          setSuccess(copy.partialLabel);
        }
        // The owner's page lists the gallery below; let it pick up the new files.
        if (uploadedAny && target !== "guest") router.refresh();
      } catch (uploadError) {
        const message =
          uploadError instanceof TypeError
            ? s.errNetwork
            : uploadError instanceof Error
              ? uploadError.message
              : s.errStart;
        setError(message);
        targetItems.forEach((item) => updateItem(item.id, { status: "error", message }));
      }
    });
  }

  function startUpload() {
    if (activeItems.length === 0) {
      setError(s.errFilesRequired);
      return;
    }
    if (target === "guest" && pinRequired && !pin.trim()) {
      setError(s.errPinRequired);
      return;
    }
    void uploadItems(activeItems);
  }

  function retryFailed() {
    const failedItems = items.filter((item) => item.status === "error");
    if (failedItems.length === 0) return;
    void uploadItems(failedItems.map((item) => ({ ...item, status: "queued", progress: 0, message: undefined })));
  }

  function removeSelectedFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function clearList() {
    setItems([]);
    setSkipped([]);
    setError(null);
    setSuccess(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ─── Hidden file input (shared across all phases) ─────────────────────────
  const fileInput = (
    <input
      ref={inputRef}
      multiple
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => {
        mergeFiles(Array.from(e.target.files ?? []));
        if (inputRef.current) inputRef.current.value = "";
      }}
    />
  );

  // Lives in both the choose and the review step: a guest who picked photos
  // before typing the PIN must still be able to enter it.
  const pinField = (
    <label className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="text-sm font-semibold text-[var(--color-ink)]">
        🔑 {s.pinLabel}{" "}
        <span className="font-medium text-[#c0392b]">{s.required}</span>
      </span>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="rounded-2xl border border-black/10 bg-[var(--color-paper)] px-4 py-3 text-sm placeholder:text-black/28 focus:border-[var(--color-accent)] focus:outline-none"
        placeholder={s.pinPlaceholder}
        // Shared event PIN, read off a card: shown, not masked, and never
        // offered to the phone's password manager.
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </label>
  );

  const skippedNotice = skipped.length > 0 && (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/8 bg-[var(--color-paper)]/70 px-4 py-3 text-sm text-[var(--color-ink)]">
      <span>{fill(s.duplicatesSkipped, { count: skipped.length })}</span>
      <button
        type="button"
        onClick={() => mergeFiles(skipped, { allowRepeats: true })}
        className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
      >
        {s.sendAnyway}
      </button>
    </div>
  );

  // Only this device has these files; the guest sees their photos right away
  // instead of wondering where they went while the host has not approved them.
  const sentStrip = sentPreviews.length > 0 && (
    <div className="mt-5 text-left">
      <p className="text-sm font-semibold text-[var(--color-ink)]">{s.sentTitle}</p>
      {target === "guest" ? <p className="mt-0.5 text-xs leading-5 text-black/55">{s.sentPendingNote}</p> : null}
      <ul className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {sentPreviews.map((preview) => (
          <li key={preview.id} className="relative aspect-square overflow-hidden rounded-xl bg-black/5">
            {preview.isVideo ? (
              <video src={preview.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="h-full w-full object-cover" />
            )}
            {preview.isVideo ? (
              <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 text-[10px] text-white" aria-hidden>▶</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {fileInput}

      {/* ── Step indicator ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-center">
        {STEPS.map((label, i) => {
          const isActive = i === activeStep && phase !== "success";
          const isDone   = i < activeStep || phase === "success";

          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                    isDone
                      ? "bg-[var(--color-moss)] text-white"
                      : isActive
                        ? "bg-[var(--color-accent)] text-white shadow-[0_4px_16px_rgba(226,121,82,0.38)]"
                        : "bg-black/8 text-black/30",
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive ? "text-[var(--color-accent)]" : isDone ? "text-[var(--color-moss)]" : "text-black/32",
                  )}
                >
                  {label}
                </span>
              </div>

              {i < 2 && (
                <div
                  className={cn(
                    "mx-2 mb-5 h-px w-12 transition-colors duration-300 sm:w-16",
                    i < activeStep ? "bg-[var(--color-moss)]" : "bg-black/10",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Phase: Choose ──────────────────────────────────────────────────── */}
      {phase === "choose" && (
        <div className="rounded-[32px] border border-black/8 bg-white/92 p-6 shadow-[0_8px_48px_rgba(18,24,38,0.07)] md:p-8">
          <div className="text-center">
            <div className="upload-icon-float mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--color-accent-soft)] text-4xl shadow-[0_8px_32px_rgba(226,121,82,0.18)] md:mb-5 md:h-24 md:w-24 md:rounded-[28px] md:text-5xl">
              📷
            </div>
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
              {s.chooseTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-black/52">
              {s.chooseSubtitle}
            </p>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-[20px] bg-[var(--color-accent)] px-6 py-5 text-lg font-semibold text-white shadow-[0_8px_28px_rgba(226,121,82,0.38)] transition-all hover:brightness-105 active:scale-[0.98] md:py-4 md:text-base"
          >
            <span className="text-xl">📷</span>
            {s.selectPhotosBtn}
          </button>
          {skippedNotice}

          {/* Subtle info row. The guest page lists the same facts as chips
              right under this card, so only the owner's upload shows it. */}
          {target !== "guest" && (
            <p className="mt-4 text-center text-xs text-black/55">
              JPG, PNG{allowVideo ? ", MP4, MOV" : ""}
              {" · "}{s.noAccountNeeded}
            </p>
          )}
        </div>
      )}

      {/* ── Phase: Review ──────────────────────────────────────────────────── */}
      {phase === "review" && (
        <div className="space-y-3">
          {/* Partial success banner */}
          {success && (
            <div className="rounded-2xl border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-3 text-sm font-medium text-[var(--color-moss)]">
              {success}
              {sentStrip}
            </div>
          )}
          {skippedNotice}

          {/* File list card */}
          <div className="rounded-[32px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_40px_rgba(18,24,38,0.06)] md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{s.reviewTitle}</p>
                <p className="text-sm text-black/45">
                  {fill(s.selectedCount, { count: items.length })} · {fill(s.totalSize, { size: formatBytes(totalSize) })}
                </p>
              </div>
              <button
                type="button"
                onClick={clearList}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-black/40 transition hover:bg-black/5 hover:text-black/65"
              >
                {s.clearAll}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                    item.status === "error" ? "bg-[#fff0eb]" : "bg-[var(--color-paper)]/55",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                    {item.file.type.startsWith("video") ? "🎥" : "📸"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">{item.file.name}</p>
                    <p className="text-xs text-black/42">{formatBytes(item.file.size)}</p>
                    {item.message && (
                      <p className="mt-0.5 text-xs font-medium text-[#c0392b]">{item.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(item.id)}
                    aria-label={s.removeFile}
                    className="shrink-0 rounded-full p-1.5 text-black/28 transition hover:bg-black/8 hover:text-[#c0392b]"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Asked here, after the photos are picked, not before: at the event the
              guest came for one button, and a form in front of it loses people. */}
          {target === "guest" ? (
            <div className="grid gap-3 rounded-[24px] border border-black/8 bg-white/92 p-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  {s.nameLabel}{" "}
                  <span className="font-normal text-black/55">{s.optional}</span>
                </span>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="rounded-2xl border border-black/10 bg-[var(--color-paper)] px-4 py-3 text-sm placeholder:text-black/40 focus:border-[var(--color-accent)] focus:outline-none"
                  placeholder={s.namePlaceholder}
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </label>
              {pinRequired && pinField}
            </div>
          ) : null}

          {/* Send button */}
          <button
            type="button"
            onClick={startUpload}
            disabled={isPending || activeItems.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-[var(--color-accent)] px-6 py-5 text-lg font-semibold text-white shadow-[0_8px_28px_rgba(226,121,82,0.38)] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 md:py-4 md:text-base"
          >
            <span className="text-xl">✉️</span>
            {s.sendBtn}
          </button>

          {/* Add more / retry */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-white/90 px-4 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)]/30 hover:bg-white"
            >
              + {s.addMoreBtn}
            </button>

            {failedCount > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#f3c8c0] bg-[#fff6f3] px-4 py-3.5 text-sm font-semibold text-[#8a2020] transition hover:bg-[#fff0eb]"
              >
                {fill(s.retryFailed, { count: failedCount })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Phase: Uploading ───────────────────────────────────────────────── */}
      {phase === "uploading" && (
        <div className="rounded-[32px] border border-black/8 bg-white/92 p-6 shadow-[0_8px_48px_rgba(18,24,38,0.07)] md:p-7">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--color-accent-soft)] border-t-[var(--color-accent)]" />
            </div>
            <p className="font-semibold text-[var(--color-ink)]">{s.uploadingTitle}</p>
            <p className="mt-1 text-xs text-black/42">{s.keepPageOpen}</p>
          </div>

          {/* Per-file progress */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl bg-[var(--color-paper)]/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{item.file.name}</p>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-semibold",
                      item.status === "error"
                        ? "text-[#c0392b]"
                        : item.status === "done"
                          ? "text-[var(--color-moss)]"
                          : item.status === "waiting" || item.status === "retrying"
                            ? "text-[var(--color-accent)]"
                            : "text-black/60",
                    )}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>

                {item.status !== "queued" && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/8">
                    <div
                      className={cn(
                        "shimmer-fill h-full rounded-full transition-all duration-300",
                        item.status === "error"
                          ? "bg-[#cc5b49]"
                          : item.status === "done"
                            ? "bg-[var(--color-moss)]"
                            : "bg-[var(--color-accent)]",
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-black/35">
            {fill(s.progress, { done: completedCount, total: items.length })}
          </p>
        </div>
      )}

      {/* ── Phase: Success ─────────────────────────────────────────────────── */}
      {phase === "success" && (
        <div className="relative overflow-hidden rounded-[32px] border border-[var(--color-moss)]/15 bg-white/95 p-8 text-center shadow-[0_8px_48px_rgba(18,24,38,0.07)]">
          {/* Confetti burst */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {CONFETTI_PIECES.map((p, i) => (
              <span
                key={i}
                className="confetti-particle"
                style={{
                  backgroundColor: p.color,
                  left:  `${p.x}%`,
                  top:   `${p.y}%`,
                  width:  `${p.w}px`,
                  height: `${p.h}px`,
                  borderRadius: i % 2 === 0 ? "50%" : "2px",
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Check circle */}
          <div className="check-pop success-ring mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-moss)]/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-moss)] text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l5 5 9-10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h2 className="fade-up-in font-display text-2xl font-semibold text-[var(--color-ink)]">
            {s.successTitle}
          </h2>
          <p className="fade-up-in-delay mx-auto mt-2 max-w-sm text-sm leading-6 text-black/62">
            {success}
          </p>
          {s.successNext ? (
            <p className="fade-up-in-delay mx-auto mt-2 max-w-sm text-sm leading-6 text-black/48">{s.successNext}</p>
          ) : null}
          {sentStrip ? <div className="fade-up-in-delay relative">{sentStrip}</div> : null}

          <div className="fade-up-in-delay-2 mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => { setSuccess(null); setError(null); setItems([]); inputRef.current?.click(); }}
              className="inline-flex items-center gap-2 rounded-[16px] bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(226,121,82,0.32)] transition hover:brightness-105"
            >
              + {s.uploadAnotherBtn}
            </button>
            {nextLink ? (
              <Link
                href={nextLink.href}
                className="inline-flex items-center gap-2 rounded-[16px] border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-soft)]/20"
              >
                {nextLink.label}
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && phase !== "uploading" && phase !== "success" && (
        <div className="mt-4 rounded-2xl bg-[#fff0eb] px-5 py-4">
          <p className="text-sm font-semibold text-[#8a1c1c]">⚠️ {error}</p>
          {failedCount > 0 && (
            <button
              type="button"
              onClick={retryFailed}
              className="mt-2 text-sm font-semibold text-[var(--color-accent)]"
            >
              {s.tryAgain}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
