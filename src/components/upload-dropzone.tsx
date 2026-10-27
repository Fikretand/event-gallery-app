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
import { AlertIcon, CameraIcon, CheckIcon, CloseIcon, PhotoIcon, PlayIcon, PlusIcon, SendIcon, VideoIcon } from "@/components/ui/icons";

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
  { color: "var(--color-accent)", x: 8,  y: 25, delay: 0,    w: 8,  h: 6  },
  { color: "var(--color-accent-soft)", x: 20, y: 15, delay: 0.06, w: 6,  h: 10 },
  { color: "var(--color-moss)", x: 35, y: 30, delay: 0.12, w: 8,  h: 8  },
  { color: "var(--color-confetti-1)", x: 50, y: 10, delay: 0.04, w: 10, h: 6  },
  { color: "var(--color-confetti-2)", x: 65, y: 20, delay: 0.18, w: 6,  h: 8  },
  { color: "var(--color-accent)", x: 78, y: 28, delay: 0.08, w: 8,  h: 6  },
  { color: "var(--color-confetti-3)", x: 90, y: 12, delay: 0.14, w: 6,  h: 10 },
  { color: "var(--color-confetti-4)", x: 15, y: 40, delay: 0.02, w: 10, h: 6  },
  { color: "var(--color-moss)", x: 45, y: 35, delay: 0.16, w: 6,  h: 8  },
  { color: "var(--color-confetti-1)", x: 60, y: 18, delay: 0.1,  w: 8,  h: 6  },
  { color: "var(--color-accent-soft)", x: 82, y: 38, delay: 0.2,  w: 6,  h: 10 },
  { color: "var(--color-accent)", x: 30, y: 8,  delay: 0.07, w: 8,  h: 8  },
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
    <label className="flex flex-col gap-2 sm:col-span-2">
      <span className="field-label">
        {s.pinLabel} <span className="font-medium text-error">{s.required}</span>
      </span>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="field code"
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
    <div className="notice notice-info mt-3 flex flex-wrap items-center justify-between gap-2">
      <span>{fill(s.duplicatesSkipped, { count: skipped.length })}</span>
      <button type="button" onClick={() => mergeFiles(skipped, { allowRepeats: true })} className="btn btn-sm btn-secondary">
        {s.sendAnyway}
      </button>
    </div>
  );

  // Only this device has these files; the guest sees their photos right away
  // instead of wondering where they went while the host has not approved them.
  const sentStrip = sentPreviews.length > 0 && (
    <div className="mt-[var(--space-lg)] text-left">
      <p className="font-semibold text-ink">{s.sentTitle}</p>
      {target === "guest" ? <p className="meta mt-0.5">{s.sentPendingNote}</p> : null}
      <ul className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {sentPreviews.map((preview) => (
          <li key={preview.id} className="relative aspect-square overflow-hidden rounded-[var(--radius-inner)] bg-paper-3">
            {preview.isVideo ? (
              <video src={preview.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="h-full w-full object-cover" />
            )}
            {preview.isVideo ? (
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-night text-night-ink">
                <PlayIcon className="h-3 w-3" />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );

  // The big action on a guest's phone: the full width, 56px tall.
  const bigAction = "btn btn-primary min-h-14 w-full text-base";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {fileInput}

      {/* ── Step indicator: a real ordered list, the current step named ─── */}
      <ol className="mb-[var(--space-lg)] grid grid-cols-3 gap-2" aria-label={STEPS.join(", ")}>
        {STEPS.map((label, i) => {
          const isActive = i === activeStep && phase !== "success";
          const isDone = i < activeStep || phase === "success";

          return (
            <li key={label} aria-current={isActive ? "step" : undefined} className="flex flex-col gap-2">
              <span
                className={cn(
                  "h-1 rounded-full transition-colors duration-[var(--dur-short)]",
                  isDone ? "bg-moss" : isActive ? "bg-accent" : "bg-rule",
                )}
              />
              <span className={cn("flex items-center gap-1.5 text-sm", isActive ? "font-semibold text-ink" : isDone ? "text-moss" : "text-muted")}>
                {isDone ? <CheckIcon className="h-4 w-4" /> : <span className="num">{i + 1}</span>}
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── Phase: Choose ──────────────────────────────────────────────────── */}
      {phase === "choose" && (
        <div className="card p-[var(--space-lg)] md:p-[var(--space-xl)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-inner)] bg-accent-soft text-accent">
            <CameraIcon className="h-6 w-6" />
          </span>
          <h2 className="title mt-[var(--space-md)] text-ink">{s.chooseTitle}</h2>
          <p className="mt-[var(--space-xs)] max-w-[36ch] text-ink-2">{s.chooseSubtitle}</p>

          <button type="button" onClick={() => inputRef.current?.click()} className={cn(bigAction, "mt-[var(--space-lg)]")}>
            <CameraIcon />
            {s.selectPhotosBtn}
          </button>
          {skippedNotice}

          {/* The guest page lists the same facts under this card, so only the
              owner's upload shows them here. */}
          {target !== "guest" && (
            <p className="meta mt-[var(--space-md)]">
              JPG, PNG{allowVideo ? ", MP4, MOV" : ""}. {s.noAccountNeeded}
            </p>
          )}
        </div>
      )}

      {/* ── Phase: Review ──────────────────────────────────────────────────── */}
      {phase === "review" && (
        <div className="space-y-3">
          {/* Partial success banner */}
          {success && (
            <div role="status" className="notice notice-success">
              {success}
              {sentStrip}
            </div>
          )}
          {skippedNotice}

          {/* File list card */}
          <div className="card p-[var(--space-lg)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">{s.reviewTitle}</h2>
                <p className="meta">
                  {fill(s.selectedCount, { count: items.length })}, {fill(s.totalSize, { size: formatBytes(totalSize) })}
                </p>
              </div>
              <button type="button" onClick={clearList} className="btn btn-sm btn-quiet text-ink-2">
                {s.clearAll}
              </button>
            </div>

            <ul className="mt-[var(--space-md)] divide-y divide-rule border-y border-rule">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cn("flex items-center gap-3 py-3", item.status === "error" && "bg-error-soft px-2")}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-paper-2 text-ink-2">
                    {item.file.type.startsWith("video") ? <VideoIcon /> : <PhotoIcon />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>
                    <p className="text-sm text-muted">{formatBytes(item.file.size)}</p>
                    {item.message && <p className="mt-0.5 text-sm font-medium text-error">{item.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(item.id)}
                    aria-label={s.removeFile}
                    className="btn btn-sm btn-quiet min-w-11 text-muted hover:text-error"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Asked here, after the photos are picked, not before: at the event the
              guest came for one button, and a form in front of it loses people. */}
          {target === "guest" ? (
            <div className="card grid gap-[var(--space-md)] p-[var(--space-lg)]">
              <label className="flex flex-col gap-2">
                <span className="field-label">
                  {s.nameLabel} <span className="font-normal text-ink-2">{s.optional}</span>
                </span>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="field"
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
            aria-busy={isPending}
            className={bigAction}
          >
            <SendIcon />
            {s.sendBtn}
          </button>

          {/* Add more / retry */}
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-secondary flex-1">
              <PlusIcon className="h-4 w-4" />
              {s.addMoreBtn}
            </button>

            {failedCount > 0 && (
              <button type="button" onClick={retryFailed} disabled={isPending} className="btn btn-danger-quiet flex-1">
                {fill(s.retryFailed, { count: failedCount })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Phase: Uploading ───────────────────────────────────────────────── */}
      {phase === "uploading" && (
        <div className="card p-[var(--space-lg)]" aria-live="polite">
          <div className="flex items-center gap-4">
            <span className="keep-motion h-10 w-10 shrink-0 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-ink">{s.uploadingTitle}</h2>
              <p className="meta">{s.keepPageOpen}</p>
            </div>
          </div>

          {/* Per-file progress */}
          <ul className="mt-[var(--space-lg)] space-y-4">
            {items.map((item) => (
              <li key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      item.status === "error"
                        ? "text-error"
                        : item.status === "done"
                          ? "text-moss"
                          : item.status === "waiting" || item.status === "retrying"
                            ? "text-accent"
                            : "text-ink-2",
                    )}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>

                {item.status !== "queued" && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-3">
                    <div
                      className={cn(
                        "h-full origin-left rounded-full transition-transform duration-[var(--dur-short)] ease-linear",
                        item.status !== "done" && item.status !== "error" && "shimmer-fill",
                        item.status === "error" ? "bg-error" : item.status === "done" ? "bg-moss" : "bg-accent",
                      )}
                      style={{ transform: `scaleX(${item.progress / 100})` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <p className="meta mt-[var(--space-lg)]">{fill(s.progress, { done: completedCount, total: items.length })}</p>
        </div>
      )}

      {/* ── Phase: Success ─────────────────────────────────────────────────── */}
      {phase === "success" && (
        <div role="status" className="card relative overflow-hidden p-[var(--space-xl)]">
          {/* Confetti, once */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {CONFETTI_PIECES.map((p, i) => (
              <span
                key={i}
                className="confetti-particle"
                style={{
                  backgroundColor: p.color,
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.w}px`,
                  height: `${p.h}px`,
                  borderRadius: i % 2 === 0 ? "50%" : "2px",
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>

          <span className="check-pop flex h-14 w-14 items-center justify-center rounded-full bg-moss text-accent-ink">
            <CheckIcon className="h-7 w-7" />
          </span>

          <h2 className="fade-up-in title mt-[var(--space-lg)] text-ink">{s.successTitle}</h2>
          <p className="fade-up-in mt-[var(--space-xs)] max-w-[44ch] text-ink-2">{success}</p>
          {s.successNext ? <p className="fade-up-in mt-[var(--space-xs)] max-w-[44ch] text-muted">{s.successNext}</p> : null}
          {sentStrip ? <div className="fade-up-in relative">{sentStrip}</div> : null}

          <div className="fade-up-in mt-[var(--space-lg)] flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => { setSuccess(null); setError(null); setItems([]); inputRef.current?.click(); }}
              className="btn btn-primary"
            >
              <PlusIcon className="h-4 w-4" />
              {s.uploadAnotherBtn}
            </button>
            {nextLink ? (
              <Link href={nextLink.href} className="btn btn-secondary">
                {nextLink.label}
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && phase !== "uploading" && phase !== "success" && (
        <div role="alert" className="notice notice-error mt-4">
          <p className="flex items-start gap-2 font-semibold">
            <AlertIcon className="mt-0.5 h-4 w-4" />
            {error}
          </p>
          {failedCount > 0 && (
            <button type="button" onClick={retryFailed} className="link mt-2 inline-flex min-h-11 items-center">
              {s.tryAgain}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
