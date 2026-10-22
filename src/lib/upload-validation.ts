import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  DEFAULT_MAX_GUEST_UPLOAD_MB,
  MAX_GUEST_FILES_PER_UPLOAD,
  MAX_PHOTOGRAPHER_FILES_PER_UPLOAD,
  MAX_PHOTOGRAPHER_UPLOAD_MB,
} from "@/lib/constants";
import type { EventSettingsRecord, MediaSourceType, UploadRequestFile } from "@/lib/types";

function extension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

const allowedExtensions = new Set(["jpg", "jpeg", "png", "heic", "heif", "mp4", "mov"]);

export function uploadLimitsFor(sourceType: MediaSourceType, settings?: EventSettingsRecord | null) {
  const maxMb = sourceType === "photographer" ? MAX_PHOTOGRAPHER_UPLOAD_MB : settings?.max_guest_upload_mb ?? DEFAULT_MAX_GUEST_UPLOAD_MB;
  const allowVideo = sourceType === "photographer" ? true : settings?.allow_guest_video ?? false;
  return { maxMb, maxBytes: maxMb * 1024 * 1024, allowVideo };
}

/**
 * Checks the object R2 actually stored (size and type from a HEAD request)
 * against the same limits the grant was issued under. The browser could send
 * any bytes to a presigned URL and report anything at confirm; this is what
 * the database records instead.
 */
export function checkStoredUpload(
  stored: { size: number; contentType: string },
  sourceType: MediaSourceType,
  settings?: EventSettingsRecord | null,
): "ok" | "too_large" | "empty" | "bad_type" {
  const { maxBytes, allowVideo } = uploadLimitsFor(sourceType, settings);
  const type = stored.contentType.split(";")[0].trim().toLowerCase();
  const isImage = ACCEPTED_IMAGE_TYPES.includes(type);
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(type);
  if (!isImage && !(isVideo && allowVideo)) return "bad_type";
  if (!Number.isSafeInteger(stored.size) || stored.size <= 0) return "empty";
  if (stored.size > maxBytes) return "too_large";
  return "ok";
}

export function validateUploadFiles(
  files: UploadRequestFile[],
  sourceType: MediaSourceType,
  settings?: EventSettingsRecord | null,
) {
  if (files.length === 0) {
    throw new Error("Add at least one file before sending.");
  }

  const maxFiles = sourceType === "photographer" ? MAX_PHOTOGRAPHER_FILES_PER_UPLOAD : MAX_GUEST_FILES_PER_UPLOAD;
  if (files.length > maxFiles) {
    throw new Error(`You can upload up to ${maxFiles} files at once.`);
  }

  const { maxMb, allowVideo } = uploadLimitsFor(sourceType, settings);

  return files.map((file) => {
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    const maxBytes = maxMb * 1024 * 1024;
    const fileExtension = extension(file.name);

    if (!file.name.trim()) {
      throw new Error("Every file must have a valid filename.");
    }

    if (!allowedExtensions.has(fileExtension)) {
      throw new Error(`${file.name}: file extension is not supported.`);
    }

    if (!isImage && !isVideo) {
      throw new Error(`${file.name}: file type is not supported.`);
    }

    if (isVideo && !allowVideo) {
      throw new Error(`${file.name}: guest video uploads are disabled for this event.`);
    }

    // A size must be a real whole number: NaN or a string used to slip past
    // both this cap and the storage quota.
    if (!Number.isSafeInteger(file.size)) {
      throw new Error(`${file.name}: file size is invalid.`);
    }

    if (file.size <= 0) {
      throw new Error(`${file.name}: file is empty.`);
    }

    if (file.size > maxBytes) {
      throw new Error(`${file.name}: exceeds the ${maxMb} MB limit.`);
    }

    return file;
  });
}
