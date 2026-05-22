"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import type { AccountType } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

type UploadStatusValue = "queued" | "requesting" | "uploading" | "confirming" | "done" | "error";

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
};

type Grant = {
  objectKey: string;
  uploadUrl: string;
  contentType: string;
  originalFilename: string;
  size: number;
  sourceType: UploadTarget;
  confirmToken: string;
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

function uploadFile(uploadUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

function itemId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function statusLabel(status: UploadStatusValue) {
  switch (status) {
    case "queued":     return "Waiting";
    case "requesting": return "Preparing";
    case "uploading":  return "Uploading";
    case "confirming": return "Saving";
    case "done":       return "Done";
    case "error":      return "Failed";
    default:           return status;
  }
}

export function UploadDropzone({ endpoint, target, allowVideo, pinRequired, audience = "photographer" }: Props) {
  const [guestName, setGuestName]   = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [pin, setPin]               = useState("");
  const [items, setItems]           = useState<UploadItem[]>([]);
  const [success, setSuccess]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ─── Derived copy strings ──────────────────────────────────────────────────
  const copy = useMemo(
    () =>
      target === "guest"
        ? {
            title:        "Share your photos",
            subtitle:     "Tap the big button below to choose photos from your phone. It only takes a moment!",
            chooseLabel:  "Choose Photos",
            sendLabel:    "Send Photos",
            pendingLabel: "Sending...",
            successLabel: "Your photos are safely saved! The event host will see them soon. 🎉",
            partialLabel: "Some photos were sent, but a few couldn't be uploaded. Try sending them again.",
            queueTitle:   "Ready to send",
            badge:        "Guest upload",
          }
        : {
            title:        audience === "couple" ? "Upload your gallery files" : "Upload final gallery files",
            subtitle:
              audience === "couple"
                ? "Choose the photos and videos you want to keep in this private event space."
                : "Choose the finished photos and videos, then upload them to the pro gallery.",
            chooseLabel:  "Add Files",
            sendLabel:    audience === "couple" ? "Upload to Gallery" : "Upload Files",
            pendingLabel: "Uploading...",
            successLabel:
              audience === "couple"
                ? "Upload complete. Your files are now in the private gallery."
                : "Upload complete. Your files are now in the pro gallery.",
            partialLabel: "Some files were uploaded, but a few still need attention.",
            queueTitle:   "Review before uploading",
            badge:        audience === "couple" ? "Private gallery upload" : "Pro gallery upload",
          },
    [audience, target],
  );

  // ─── Accepted file types ───────────────────────────────────────────────────
  const accept = useMemo(() => {
    const base = [".jpg", ".jpeg", ".png", ".heic", ".heif"];
    return allowVideo ? [...base, ".mp4", ".mov"].join(",") : base.join(",");
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
  const STEPS = ["Choose", "Review", "Send"] as const;

  // ─── State helpers ─────────────────────────────────────────────────────────
  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function mergeFiles(nextFiles: File[]) {
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

      try {
        targetItems.forEach((item) => updateItem(item.id, { status: "requesting", progress: 0, message: undefined }));

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName:  guestName  || undefined,
            guestEmail: guestEmail || undefined,
            pin:        pin        || undefined,
            files: targetItems.map((item) => ({
              name: item.file.name,
              size: item.file.size,
              type: item.file.type,
            })),
          }),
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Failed to start upload.");

        const grants = payload.grants as Grant[];

        for (let index = 0; index < grants.length; index += 1) {
          const grant       = grants[index];
          const currentItem = targetItems[index];

          updateItem(currentItem.id, { status: "uploading", progress: 0, message: undefined });

          try {
            await uploadFile(grant.uploadUrl, currentItem.file, (progress) => {
              updateItem(currentItem.id, { progress });
            });

            updateItem(currentItem.id, { status: "confirming", progress: 100 });

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
              }),
            });

            const confirmPayload = await confirmResponse.json();
            if (!confirmResponse.ok) {
              throw new Error(confirmPayload.error ?? `Failed to confirm ${currentItem.file.name}.`);
            }

            uploadedAny = true;
            updateItem(currentItem.id, { status: "done", progress: 100, message: undefined });
          } catch (itemError) {
            const message =
              itemError instanceof Error ? itemError.message : `Failed to upload ${currentItem.file.name}.`;
            updateItem(currentItem.id, { status: "error", message });
          }
        }

        const finalItems   = items.map((item) => targetItems.find((t) => t.id === item.id) ?? item);
        const stillFailed  = finalItems.some((item) => item.status === "error");

        setItems((current) => current.filter((item) => item.status !== "done"));
        if (inputRef.current) inputRef.current.value = "";

        if (uploadedAny && !stillFailed) {
          setSuccess(copy.successLabel);
        } else if (uploadedAny) {
          setSuccess(copy.partialLabel);
        }
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
        setError(message);
        targetItems.forEach((item) => updateItem(item.id, { status: "error", message }));
      }
    });
  }

  function startUpload() {
    if (activeItems.length === 0) {
      setError("Add at least one file before sending.");
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
            <div className="upload-icon-float mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] bg-[var(--color-accent-soft)] text-5xl shadow-[0_8px_32px_rgba(226,121,82,0.18)]">
              📷
            </div>
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
              {copy.title}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-black/52">
              {copy.subtitle}
            </p>
          </div>

          {/* Optional guest fields */}
          {target === "guest" && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  Your name{" "}
                  <span className="font-normal text-black/35">(optional)</span>
                </span>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="rounded-2xl border border-black/10 bg-[var(--color-paper)] px-4 py-3 text-sm placeholder:text-black/28 focus:border-[var(--color-accent)] focus:outline-none"
                  placeholder="e.g. Ana Kovač"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  Email{" "}
                  <span className="font-normal text-black/35">(optional)</span>
                </span>
                <input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="rounded-2xl border border-black/10 bg-[var(--color-paper)] px-4 py-3 text-sm placeholder:text-black/28 focus:border-[var(--color-accent)] focus:outline-none"
                  placeholder="ana@example.com"
                  type="email"
                />
              </label>

              {pinRequired && (
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    🔑 Event PIN{" "}
                    <span className="font-medium text-[#c0392b]">required</span>
                  </span>
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="rounded-2xl border border-black/10 bg-[var(--color-paper)] px-4 py-3 text-sm placeholder:text-black/28 focus:border-[var(--color-accent)] focus:outline-none"
                    placeholder="Enter the PIN from your host"
                    type="password"
                  />
                </label>
              )}
            </div>
          )}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-[20px] bg-[var(--color-accent)] px-6 py-5 text-lg font-semibold text-white shadow-[0_8px_28px_rgba(226,121,82,0.38)] transition-all hover:brightness-105 active:scale-[0.98] md:py-4 md:text-base"
          >
            <span className="text-xl">📷</span>
            {copy.chooseLabel}
          </button>

          {/* Subtle info row */}
          <p className="mt-4 text-center text-xs text-black/36">
            JPG, PNG, HEIC{allowVideo ? ", MP4, MOV" : ""}
            {" · "}No account needed
          </p>
        </div>
      )}

      {/* ── Phase: Review ──────────────────────────────────────────────────── */}
      {phase === "review" && (
        <div className="space-y-3">
          {/* Partial success banner */}
          {success && (
            <div className="rounded-2xl border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-3 text-sm font-medium text-[var(--color-moss)]">
              {success}
            </div>
          )}

          {/* File list card */}
          <div className="rounded-[32px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_40px_rgba(18,24,38,0.06)] md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--color-ink)]">
                  {items.length} {items.length === 1 ? "photo" : "photos"} ready
                </p>
                <p className="text-sm text-black/45">{formatBytes(totalSize)} total</p>
              </div>
              <button
                type="button"
                onClick={clearList}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-black/40 transition hover:bg-black/5 hover:text-black/65"
              >
                Clear all
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
                    aria-label="Remove file"
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

          {/* Send button */}
          <button
            type="button"
            onClick={startUpload}
            disabled={isPending || activeItems.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-[var(--color-accent)] px-6 py-5 text-lg font-semibold text-white shadow-[0_8px_28px_rgba(226,121,82,0.38)] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 md:py-4 md:text-base"
          >
            <span className="text-xl">✉️</span>
            {copy.sendLabel}
          </button>

          {/* Add more / retry */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-white/90 px-4 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)]/30 hover:bg-white"
            >
              + Add more
            </button>

            {failedCount > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#f3c8c0] bg-[#fff6f3] px-4 py-3.5 text-sm font-semibold text-[#8a2020] transition hover:bg-[#fff0eb]"
              >
                ↺ Retry {failedCount} failed
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
            <p className="font-semibold text-[var(--color-ink)]">Sending your photos…</p>
            <p className="mt-1 text-xs text-black/42">Please don&apos;t close this page</p>
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
                          : "text-black/40",
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
            {completedCount} of {items.length} sent
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
            Photos sent! 🎉
          </h2>
          <p className="fade-up-in-delay mx-auto mt-2 max-w-xs text-sm leading-6 text-black/52">
            {success}
          </p>

          <button
            type="button"
            onClick={() => { setSuccess(null); setError(null); setItems([]); }}
            className="fade-up-in-delay-2 mt-6 inline-flex items-center gap-2 rounded-[16px] border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-soft)]/20"
          >
            + Upload more photos
          </button>
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
              Try again →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
