"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
  | { kind: "camera"; recording: boolean }
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
 * The first container the browser can record: MP4 on Safari (and recent
 * Chrome), WebM elsewhere. Small bitrates keep 20 seconds near 5 MB.
 */
function pickRecorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function canRecordInPage() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && pickRecorderType() !== undefined;
}

// One message per phone and event, remembered on the phone. The server cannot
// tell two phones on the same venue Wi-Fi apart, so this is the honest limit.
const sentKey = (slug: string) => `confetti-message-sent:${slug}`;
const SENT_CHANGED = "confetti:message-sent";

function readSent(slug: string) {
  try {
    return window.localStorage.getItem(sentKey(slug)) === "1";
  } catch {
    return false;
  }
}

function subscribeSent(onChange: () => void) {
  window.addEventListener(SENT_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SENT_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * A guest records a short message for the hosts, with the front camera, in
 * the page: a live preview, a countdown, and the recording stops itself at
 * MESSAGE_MAX_SECONDS. Where the browser cannot record (old phones, camera
 * refused), the phone's own front camera (`capture="user"`) is the fallback,
 * and a longer clip is refused from its metadata.
 *
 * The clip goes up through the same presigned path as photos, marked as a
 * message by the key the server mints for it.
 */
export function VideoMessage({ slug, pinRequired, strings: s, upload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [secondsLeft, setSecondsLeft] = useState(MESSAGE_MAX_SECONDS);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const alreadySent = useSyncExternalStore(subscribeSent, () => readSent(slug), () => false);

  function stopStream() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function releaseUrl() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  useEffect(
    () => () => {
      stopStream();
      releaseUrl();
    },
    [],
  );

  // Show the live camera once its <video> is on the page.
  useEffect(() => {
    if (phase.kind === "camera" && previewRef.current && streamRef.current && !previewRef.current.srcObject) {
      previewRef.current.srcObject = streamRef.current;
      previewRef.current.play().catch(() => {});
    }
  }, [phase]);

  async function openCamera() {
    setError(null);
    if (!canRecordInPage()) {
      setCameraFailed(true);
      inputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      releaseUrl();
      setSecondsLeft(MESSAGE_MAX_SECONDS);
      setPhase({ kind: "camera", recording: false });
    } catch {
      setCameraFailed(true);
      setError(s.cameraError);
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    const mimeType = pickRecorderType();
    if (!stream || !mimeType) return;

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 96_000 });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stopStream();
      const type = mimeType.split(";")[0];
      const blob = new Blob(chunks, { type });
      const file = new File([blob], `poruka.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setPhase({ kind: "picked", file, url });
    };

    // The countdown starts when the recorder really does, not on the tap.
    recorder.onstart = () => {
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const left = MESSAGE_MAX_SECONDS - (Date.now() - startedAt) / 1000;
        setSecondsLeft(Math.max(0, Math.ceil(left)));
        if (left <= 0) stopRecording();
      }, 200);
    };
    recorder.start(1000);
    setPhase({ kind: "camera", recording: true });
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function cancelCamera() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    stopStream();
    setPhase({ kind: "idle" });
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
            files: [{ name: file.name || "poruka.mp4", size: file.size, type: file.type }],
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
      try {
        window.localStorage.setItem(sentKey(slug), "1");
      } catch {
        // Storage blocked: the limit holds for this visit only.
      }
      window.dispatchEvent(new Event(SENT_CHANGED));
      setPhase({ kind: "sent" });
    } catch (sendError) {
      setPhase({ kind: "picked", file, url });
      setError(sendError instanceof Error && sendError.message ? sendError.message : s.failed);
    }
  }

  const fallbackInput = (
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

  const doneHere = phase.kind === "sent" || (alreadySent && phase.kind === "idle");

  return (
    <section aria-labelledby="video-message-title" className="card mt-[var(--space-md)] p-[var(--space-lg)]">
      {fallbackInput}
      <h2 id="video-message-title" className="title flex items-center gap-3 text-ink">
        <VideoIcon className="h-6 w-6 text-accent" />
        {s.title}
      </h2>
      <p className="mt-[var(--space-xs)] text-ink-2">{s.body}</p>

      {doneHere ? (
        <div role="status" className="notice notice-success mt-[var(--space-md)]">
          <p className="font-semibold">{phase.kind === "sent" ? s.sentTitle : s.alreadySentTitle}</p>
          <p className="mt-0.5">{phase.kind === "sent" ? s.sentBody : s.alreadySentBody}</p>
        </div>
      ) : phase.kind === "idle" ? (
        <div className="mt-[var(--space-md)] space-y-3">
          <button type="button" onClick={openCamera} className="btn btn-secondary min-h-14 w-full text-base">
            <VideoIcon />
            {s.recordBtn}
          </button>
          {cameraFailed ? (
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-quiet w-full">
              {s.fallbackBtn}
            </button>
          ) : null}
        </div>
      ) : phase.kind === "camera" ? (
        <div className="mt-4 space-y-3">
          <div className="relative overflow-hidden rounded-[var(--radius-image)] bg-night">
            {/* Mirrored like a selfie camera, so moving left moves left. */}
            <video
              ref={previewRef}
              muted
              playsInline
              autoPlay
              aria-label={s.title}
              className="aspect-[3/4] w-full -scale-x-100 object-cover sm:aspect-video"
            />
            {phase.recording ? (
              <div className="absolute inset-x-0 top-0 p-3">
                <div className="h-1 overflow-hidden rounded-full bg-night-ink/25" aria-hidden="true">
                  <div
                    className="h-full origin-left bg-accent transition-transform duration-200 ease-linear motion-reduce:transition-none"
                    style={{ transform: `scaleX(${secondsLeft / MESSAGE_MAX_SECONDS})` }}
                  />
                </div>
                <p
                  role="timer"
                  aria-live="polite"
                  className="num mt-2 inline-flex items-center gap-2 rounded-full bg-night/70 px-3 py-1 text-sm font-semibold text-night-ink"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-error" aria-hidden="true" />
                  {fill(s.secondsLeft, { seconds: secondsLeft })}
                </p>
              </div>
            ) : (
              <p className="num absolute left-3 top-3 rounded-full bg-night/70 px-3 py-1 text-sm font-semibold text-night-ink">
                {fill(s.secondsLeft, { seconds: MESSAGE_MAX_SECONDS })}
              </p>
            )}
          </div>
          {phase.recording ? (
            <button type="button" onClick={stopRecording} className="btn btn-ink min-h-14 w-full text-base">
              {s.stopBtn}
            </button>
          ) : (
            <button type="button" onClick={startRecording} className="btn btn-primary min-h-14 w-full text-base">
              {s.startBtn}
            </button>
          )}
          <button type="button" onClick={cancelCamera} className="btn btn-quiet w-full">
            {s.cancelBtn}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <video src={phase.url} controls playsInline className="aspect-[3/4] w-full rounded-[var(--radius-image)] bg-night object-contain sm:aspect-video" />
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
            <button type="button" onClick={cameraFailed ? () => inputRef.current?.click() : openCamera} className="btn btn-secondary w-full">
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
