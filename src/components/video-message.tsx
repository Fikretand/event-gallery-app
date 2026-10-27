"use client";

import { useEffect, useRef, useState } from "react";

import type { Dict } from "@/lib/i18n/index";
import { extractVideoThumbnail, RETRY, uploadFile } from "@/lib/upload-client";
import { RetryableUploadError, isRetryableStatus, withRetry } from "@/lib/upload-queue";
import { MESSAGE_MAX_SECONDS } from "@/lib/video-messages";
import { VideoIcon } from "@/components/ui/icons";

type ApiErrorCode = keyof Dict["uploadDropzone"]["apiErrors"];

type Props = {
  slug: string;
  pinRequired: boolean;
  strings: Dict["videoMessage"];
  /** Labels shared with the photo upload: PIN field and the routes' error codes. */
  upload: Pick<Dict["uploadDropzone"], "pinLabel" | "pinPlaceholder" | "required" | "apiErrors">;
};

type Phase =
  | { kind: "idle" }
  | { kind: "picked"; file: File; url: string }
  | { kind: "sending"; file: File; url: string; progress: number }
  | { kind: "sent" };

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** Length in seconds from the file's metadata; null when the browser cannot tell. */
function readDuration(url: string) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const timer = window.setTimeout(() => resolve(null), 8000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    video.src = url;
  });
}

/**
 * A guest records a short message for the hosts. The phone's own camera does
 * the recording (`capture`), which works on iOS and Android without any
 * recording code here, and the clip goes up through the same presigned path as
 * photos, marked as a message by the key the server mints for it.
 */
export function VideoMessage({ slug, pinRequired, strings: s, upload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function releaseUrl() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("video/")) {
      setError(s.notVideo);
      return;
    }

    releaseUrl();
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const seconds = await readDuration(url);
    // One second of slack: phones round the recorded length up.
    if (seconds !== null && seconds > MESSAGE_MAX_SECONDS + 1) {
      releaseUrl();
      setPhase({ kind: "idle" });
      setError(fill(s.tooLong, { seconds: MESSAGE_MAX_SECONDS }));
      return;
    }
    setPhase({ kind: "picked", file, url });
  }

  function apiErrorText(payload: { error?: string; code?: string }) {
    const translated = payload.code ? upload.apiErrors[payload.code as ApiErrorCode] : undefined;
    return translated ?? s.failed;
  }

  async function send() {
    if (phase.kind !== "picked") return;
    if (!name.trim()) {
      setError(s.nameRequired);
      return;
    }
    const { file, url } = phase;
    setError(null);
    setPhase({ kind: "sending", file, url, progress: 0 });

    try {
      const session = await withRetry(async () => {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}/guest-upload-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: "message",
            guestName: name.trim(),
            pin: pin || undefined,
            files: [{ name: file.name || "message.mp4", size: file.size, type: file.type }],
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (isRetryableStatus(response.status)) throw new RetryableUploadError(apiErrorText(body));
        if (!response.ok) throw new Error(apiErrorText(body));
        return body as {
          uploadSessionId: string;
          grants: {
            objectKey: string;
            uploadUrl: string;
            confirmToken: string;
            originalFilename: string;
            thumbnailObjectKey?: string;
            thumbnailUploadUrl?: string;
            thumbnailConfirmToken?: string;
          }[];
        };
      }, RETRY);

      const grant = session.grants[0];
      await withRetry(
        () => uploadFile(grant.uploadUrl, file, (progress) => setPhase({ kind: "sending", file, url, progress })),
        RETRY,
      );

      // Best effort, as for any guest video: a poster frame for the gallery.
      let thumbnailKey: string | undefined;
      let thumbnailConfirmToken: string | undefined;
      if (grant.thumbnailUploadUrl) {
        const poster = await extractVideoThumbnail(file);
        if (poster) {
          const put = await fetch(grant.thumbnailUploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: poster }).catch(
            () => null,
          );
          if (put?.ok) {
            thumbnailKey = grant.thumbnailObjectKey;
            thumbnailConfirmToken = grant.thumbnailConfirmToken;
          }
        }
      }

      await withRetry(async () => {
        const response = await fetch("/api/uploads/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectKey: grant.objectKey,
            confirmToken: grant.confirmToken,
            originalFilename: grant.originalFilename,
            uploadSessionId: session.uploadSessionId,
            thumbnailKey,
            thumbnailConfirmToken,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (isRetryableStatus(response.status)) throw new RetryableUploadError(s.failed);
        if (!response.ok) throw new Error(body.error ?? s.failed);
      }, RETRY);

      releaseUrl();
      setPhase({ kind: "sent" });
    } catch (sendError) {
      setPhase({ kind: "picked", file, url });
      setError(sendError instanceof Error && sendError.message ? sendError.message : s.failed);
    }
  }

  const recordInput = (
    <input
      ref={inputRef}
      type="file"
      accept="video/*"
      // The front camera: a message is said to the camera, not filmed of the room.
      capture="user"
      onChange={onPick}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
    />
  );

  return (
    <section
      aria-labelledby="video-message-title"
      className="card mt-[var(--space-md)] p-[var(--space-lg)]"
    >
      {recordInput}
      <h2 id="video-message-title" className="title flex items-center gap-3 text-ink">
        <VideoIcon className="h-6 w-6 text-accent" />
        {s.title}
      </h2>
      <p className="mt-[var(--space-xs)] text-ink-2">{s.body}</p>

      {phase.kind === "sent" ? (
        <div role="status" className="notice notice-success mt-[var(--space-md)]">
          <p className="font-semibold">{s.sentTitle}</p>
          <p className="mt-0.5">{s.sentBody}</p>
          <button
            type="button"
            onClick={() => {
              setPhase({ kind: "idle" });
              inputRef.current?.click();
            }}
            className="btn btn-sm btn-secondary mt-3"
          >
            {s.another}
          </button>
        </div>
      ) : phase.kind === "idle" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-secondary mt-[var(--space-md)] min-h-14 w-full text-base"
        >
          <VideoIcon />
          {s.recordBtn}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <video src={phase.url} controls playsInline className="aspect-video w-full rounded-[var(--radius-image)] bg-night object-contain" />
          <label className="flex flex-col gap-2">
            <span className="field-label">
              {s.nameLabel} <span className="font-medium text-error">{upload.required}</span>
            </span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error === s.nameRequired) setError(null);
              }}
              placeholder={s.namePlaceholder}
              autoComplete="name"
              autoCapitalize="words"
              className="field"
            />
          </label>
          {pinRequired ? (
            <label className="flex flex-col gap-2">
              <span className="field-label">
                {upload.pinLabel} <span className="font-medium text-error">{upload.required}</span>
              </span>
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder={upload.pinPlaceholder}
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="field code"
              />
            </label>
          ) : null}
          <button
            type="button"
            onClick={send}
            disabled={phase.kind === "sending"}
            aria-busy={phase.kind === "sending"}
            className="btn btn-primary min-h-14 w-full text-base"
          >
            {phase.kind === "sending" ? fill(s.sending, { progress: phase.progress }) : s.sendBtn}
          </button>
          {phase.kind === "picked" ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-secondary w-full"
            >
              {s.retakeBtn}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="notice notice-error mt-3">
          {error}
        </p>
      ) : null}
    </section>
  );
}
