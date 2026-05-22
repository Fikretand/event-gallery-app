"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
    case "queued":
      return "Queued";
    case "requesting":
      return "Preparing";
    case "uploading":
      return "Uploading";
    case "confirming":
      return "Finalizing";
    case "done":
      return "Done";
    case "error":
      return "Failed";
    default:
      return status;
  }
}

export function UploadDropzone({ endpoint, target, allowVideo, pinRequired, audience = "photographer" }: Props) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [pin, setPin] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const copy = useMemo(
    () =>
      target === "guest"
        ? {
            badge: "Guest upload",
            title: "Upload your files",
            subtitle: "Choose your photos and videos first, then send them in one step.",
            chooseLabel: "Choose files",
            sendLabel: "Send files",
            pendingLabel: "Sending...",
            successLabel: "Upload complete. Your files are now safely in the event.",
            partialLabel: "Some files were sent successfully, but a few still need attention.",
            queueTitle: "Ready to send",
          }
        : {
            badge: audience === "couple" ? "Private gallery upload" : "Pro gallery upload",
            title: audience === "couple" ? "Upload your gallery files" : "Upload final gallery files",
            subtitle:
              audience === "couple"
                ? "Choose the photos and videos you want to keep in this private event space."
                : "Choose the finished photos and videos first, then send them to the pro gallery.",
            chooseLabel: "Add files",
            sendLabel: audience === "couple" ? "Upload to gallery" : "Upload files",
            pendingLabel: "Uploading...",
            successLabel:
              audience === "couple"
                ? "Upload complete. Your files are now in the private gallery."
                : "Upload complete. Your files are now in the pro gallery.",
            partialLabel: "Some files were uploaded, but a few still need attention.",
            queueTitle: "Review before uploading",
          },
    [audience, target],
  );

  const accept = useMemo(() => {
    const base = [".jpg", ".jpeg", ".png", ".heic", ".heif"];
    return allowVideo ? [...base, ".mp4", ".mov"].join(",") : base.join(",");
  }, [allowVideo]);

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const completedCount = items.filter((item) => item.status === "done").length;
  const failedCount = items.filter((item) => item.status === "error").length;
  const activeItems = items.filter((item) => item.status !== "done");
  const queuedCount = items.filter((item) => item.status === "queued").length;
  const selectedPreview = items.slice(0, 3);

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function mergeFiles(nextFiles: File[]) {
    setItems((current) => {
      const merged = [...current];

      for (const file of nextFiles) {
        const id = itemId(file);
        const duplicate = merged.some((existing) => existing.id === id);

        if (!duplicate) {
          merged.push({
            id,
            file,
            status: "queued",
            progress: 0,
          });
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guestName: guestName || undefined,
            guestEmail: guestEmail || undefined,
            pin: pin || undefined,
            files: targetItems.map((item) => ({
              name: item.file.name,
              size: item.file.size,
              type: item.file.type,
            })),
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to start upload.");
        }

        const grants = payload.grants as Grant[];

        for (let index = 0; index < grants.length; index += 1) {
          const grant = grants[index];
          const currentItem = targetItems[index];

          updateItem(currentItem.id, { status: "uploading", progress: 0, message: undefined });

          try {
            await uploadFile(grant.uploadUrl, currentItem.file, (progress) => {
              updateItem(currentItem.id, { progress });
            });

            updateItem(currentItem.id, { status: "confirming", progress: 100 });

            const confirmResponse = await fetch("/api/uploads/confirm", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                eventId: payload.eventId,
                objectKey: grant.objectKey,
                originalFilename: grant.originalFilename,
                mimeType: grant.contentType,
                sizeBytes: grant.size,
                sourceType: grant.sourceType,
                uploadSessionId: payload.uploadSessionId ?? null,
                confirmToken: grant.confirmToken,
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

        const finalItems = items.map((item) => {
          const latest = targetItems.find((targetItem) => targetItem.id === item.id);
          return latest ?? item;
        });
        const stillFailed = finalItems.some((item) => item.status === "error");

        setItems((current) => current.filter((item) => item.status !== "done"));
        if (inputRef.current) {
          inputRef.current.value = "";
        }

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
    if (failedItems.length === 0) {
      return;
    }

    void uploadItems(
      failedItems.map((item) => ({
        ...item,
        status: "queued",
        progress: 0,
        message: undefined,
      })),
    );
  }

  function removeSelectedFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function clearList() {
    setItems([]);
    setError(null);
    setSuccess(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {target === "guest" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span>Your name</span>
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span>Email</span>
            <input
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
              placeholder="Optional"
              type="email"
            />
          </label>
          {pinRequired ? (
            <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
              <span>Upload PIN</span>
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                placeholder="Enter the PIN from your host"
                type="password"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        <div
          className={cn(
            "rounded-[30px] border border-dashed border-[#c8d8f0] bg-[linear-gradient(180deg,rgba(245,249,255,0.98),rgba(255,255,255,0.92))] p-5 shadow-[0_12px_40px_rgba(18,24,38,0.05)] transition md:p-7",
            isPending && "opacity-80",
          )}
        >
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f0ff]">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#2f6fd6] text-xl font-semibold text-white shadow-[0_12px_24px_rgba(47,111,214,0.22)]">
                +
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#2f6fd6] shadow">
                  +
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2f6fd6] shadow-sm">
                {copy.badge}
              </span>
              <h3 className="text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">{copy.title}</h3>
              <p className="mx-auto max-w-md text-sm leading-6 text-black/58">{copy.subtitle}</p>
            </div>

            <input
              ref={inputRef}
              multiple
              type="file"
              accept={accept}
              className="hidden"
              onChange={(event) => {
                mergeFiles(Array.from(event.target.files ?? []));
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
            />

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="secondary"
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {copy.chooseLabel}
              </Button>
              <Button
                type="button"
                onClick={startUpload}
                disabled={isPending || activeItems.length === 0}
                className="w-full sm:w-auto"
              >
                {isPending ? copy.pendingLabel : copy.sendLabel}
              </Button>
            </div>

            {items.length > 0 ? (
              <div className="mt-5 rounded-[24px] border border-[#d6e3f7] bg-white/86 p-4 text-left">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {items.length} file{items.length > 1 ? "s" : ""} selected
                </p>
                <div className="mt-3 space-y-2">
                  {selectedPreview.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-paper)]/45 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{item.file.name}</p>
                        <p className="text-xs text-black/52">{formatBytes(item.file.size)}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2f6fd6]">
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  ))}
                  {items.length > selectedPreview.length ? (
                    <p className="text-xs text-black/48">
                      +{items.length - selectedPreview.length} more file{items.length - selectedPreview.length > 1 ? "s" : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
                <div className="rounded-2xl bg-white/88 px-3 py-3 text-sm text-black/62">
                  <p className="font-semibold text-[var(--color-ink)]">1. Choose</p>
                  <p className="mt-1 text-xs leading-5">Pick the files you want to send.</p>
                </div>
                <div className="rounded-2xl bg-white/88 px-3 py-3 text-sm text-black/62">
                  <p className="font-semibold text-[var(--color-ink)]">2. Review</p>
                  <p className="mt-1 text-xs leading-5">Check the list before uploading.</p>
                </div>
                <div className="rounded-2xl bg-white/88 px-3 py-3 text-sm text-black/62">
                  <p className="font-semibold text-[var(--color-ink)]">3. Send</p>
                  <p className="mt-1 text-xs leading-5">Wait for the upload to finish.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">{copy.queueTitle}</p>
              <p className="text-sm text-black/55">
                {items.length === 0
                  ? "No files added yet."
                  : `${items.length} file${items.length > 1 ? "s" : ""} in queue · ${formatBytes(totalSize)}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {failedCount > 0 ? (
                <Button type="button" variant="ghost" onClick={retryFailed} disabled={isPending}>
                  Retry failed ({failedCount})
                </Button>
              ) : null}
              {items.length > 0 ? (
                <button type="button" onClick={clearList} className="text-sm font-semibold text-[var(--color-accent)]">
                  Clear list
                </button>
              ) : null}
            </div>
          </div>

          {items.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl px-4 py-3",
                    item.status === "error"
                      ? "border border-[#f3c8c0] bg-[#fff6f3]"
                      : item.status === "done"
                        ? "border border-[var(--color-moss)]/10 bg-[#eef8f2]"
                        : "bg-[var(--color-paper)]/55",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.file.name}</p>
                      <p className="text-xs text-black/55">{formatBytes(item.file.size)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                        {statusLabel(item.status)}
                      </p>
                      {item.status !== "queued" ? <p className="text-xs text-black/45">{item.progress}%</p> : null}
                    </div>
                  </div>

                  {item.status !== "queued" ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/85">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          item.status === "error" ? "bg-[#cc5b49]" : "bg-[var(--color-accent)]",
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : null}

                  {item.message ? <p className="mt-2 text-xs text-[#8a1c1c]">{item.message}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status === "error" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          void uploadItems([
                            {
                              ...item,
                              status: "queued",
                              progress: 0,
                              message: undefined,
                            },
                          ])
                        }
                        disabled={isPending}
                      >
                        Retry
                      </Button>
                    ) : null}

                    {item.status !== "done" ? (
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(item.id)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{error}</div> : null}
      {success ? (
        <div className="rounded-[24px] border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-4 text-sm font-medium text-[var(--color-moss)]">
          {success}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/65">
          {completedCount} of {items.length} files completed
          {failedCount > 0 ? ` · ${failedCount} failed` : ""}
          {queuedCount > 0 ? ` · ${queuedCount} waiting` : ""}
        </div>
      ) : null}
    </div>
  );
}
