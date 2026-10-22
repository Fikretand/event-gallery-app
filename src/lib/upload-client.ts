/**
 * Browser-side pieces of an upload, shared by the guest dropzone and the video
 * message recorder: the presigned PUT with progress and a stall watchdog, the
 * retry policy, and the client-extracted poster frame for videos.
 */
import { RetryableUploadError, isRetryableStatus } from "@/lib/upload-queue";

export const NETWORK_ERROR = "Network error during upload.";

// Extract a poster frame from a video, client-side, as a JPEG blob. Seeks a
// little past the start to avoid a black first frame. Best-effort: resolves
// null on any failure so the upload proceeds without a thumbnail.
export function extractVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    let url = "";
    try {
      url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = url;
      const timer = window.setTimeout(() => finish(null), 8000);
      video.onerror = () => finish(null);
      video.onloadedmetadata = () => {
        const target = Number.isFinite(video.duration) ? Math.min(1, video.duration / 2) : 0;
        video.currentTime = target;
      };
      video.onseeked = () => {
        try {
          const maxW = 1200;
          const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              window.clearTimeout(timer);
              finish(blob);
            },
            "image/jpeg",
            0.82,
          );
        } catch {
          finish(null);
        }
      };
    } catch {
      finish(null);
    }
  });
}

// A transfer that has not moved a byte for this long is treated as a dropped
// connection and started again, instead of hanging on "Uploading" for ever.
const STALL_MS = 60_000;

export function uploadFile(uploadUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastProgressAt = Date.now();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearInterval(watchdog);
      window.removeEventListener("offline", onOffline);
      if (error) reject(error);
      else resolve();
    };
    // Losing the network mid-file: stop now and let the retry wait for it.
    const onOffline = () => {
      xhr.abort();
      finish(new RetryableUploadError(NETWORK_ERROR));
    };
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastProgressAt > STALL_MS) {
        xhr.abort();
        finish(new RetryableUploadError(NETWORK_ERROR));
      }
    }, 5_000);
    window.addEventListener("offline", onOffline);

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (event) => {
      lastProgressAt = Date.now();
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish();
      } else if (isRetryableStatus(xhr.status)) {
        finish(new RetryableUploadError(`Upload failed with status ${xhr.status}`));
      } else {
        finish(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => finish(new RetryableUploadError(NETWORK_ERROR));
    xhr.send(file);
  });
}

function waitForOnline() {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// Four tries per step, waiting 2 s, 5 s, then 10 s between them. Time spent
// offline is waited out on top and does not use up a try.
export const RETRY = { attempts: 4, delaysMs: [2_000, 5_000, 10_000], waitForOnline, sleep };
