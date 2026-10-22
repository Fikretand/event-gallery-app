import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { isEventObjectKey, reportForeignKey } from "@/lib/object-keys";
import { signUploadConfirmToken } from "@/lib/security";
import { createSignedDownloadUrl, createSignedUploadUrl, getStoredObjectBuffer, publicMediaUrl, putStoredObject } from "@/lib/storage";
import type {
  EventRecord,
  MediaFileRecord,
  MediaSourceType,
  UploadGrant,
  UploadRequestFile,
} from "@/lib/types";

function normalizeExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function buildUploadGrants(
  event: EventRecord,
  files: UploadRequestFile[],
  sourceType: MediaSourceType,
): Promise<UploadGrant[]> {
  const grants: UploadGrant[] = [];

  for (const file of files) {
    const extension = normalizeExtension(file.name);
    const objectKey =
      sourceType === "guest"
        ? `events/${event.id}/guest/${currentYearMonth()}/${randomUUID()}.${extension}`
        : `events/${event.id}/photographer/originals/${randomUUID()}.${extension}`;

    const uploadUrl = await createSignedUploadUrl(objectKey, file.type);

    if (!uploadUrl) {
      throw new Error("R2 is not configured. Please add R2 credentials to the environment.");
    }

    const grant: UploadGrant = {
      objectKey,
      uploadUrl,
      contentType: file.type,
      originalFilename: file.name,
      size: file.size,
      sourceType,
      confirmToken: signUploadConfirmToken(objectKey),
    };

    // Videos have no server-side thumbnail (no ffmpeg on serverless), so hand
    // the client a presigned slot to upload a poster frame it extracts.
    if (file.type.startsWith("video/")) {
      const thumbnailObjectKey = `events/${event.id}/thumbs/vid-${randomUUID()}.jpg`;
      const thumbnailUploadUrl = await createSignedUploadUrl(thumbnailObjectKey, "image/jpeg");
      if (thumbnailUploadUrl) {
        grant.thumbnailObjectKey = thumbnailObjectKey;
        grant.thumbnailUploadUrl = thumbnailUploadUrl;
        grant.thumbnailConfirmToken = signUploadConfirmToken(thumbnailObjectKey);
      }
    }

    grants.push(grant);
  }

  return grants;
}

export async function enrichMediaWithUrls<T extends MediaFileRecord>(
  media: T[],
): Promise<(T & { previewUrl: string | null; thumbnailUrl: string | null })[]> {
  return Promise.all(
    media.map(async (item) => {
      // Sign only objects inside the row's own event (see object-keys.ts).
      const storageKey = isEventObjectKey(item.storage_key, item.event_id) ? item.storage_key : null;
      const thumbnailKey = isEventObjectKey(item.thumbnail_key, item.event_id) ? item.thumbnail_key : null;
      if (!storageKey || (item.thumbnail_key && !thumbnailKey)) {
        reportForeignKey("enrichMediaWithUrls", { mediaId: item.id, eventId: item.event_id });
      }

      const previewUrl = storageKey
        ? publicMediaUrl(storageKey) ?? (await createSignedDownloadUrl(storageKey))
        : null;
      const thumbnailUrl =
        publicMediaUrl(thumbnailKey) ??
        (thumbnailKey ? await createSignedDownloadUrl(thumbnailKey) : previewUrl);

      return {
        ...item,
        previewUrl,
        thumbnailUrl,
      };
    }),
  );
}

function isHeif(media: Pick<MediaFileRecord, "mime_type" | "original_filename">) {
  return /^image\/hei[cf]/i.test(media.mime_type) || /\.hei[cf]$/i.test(media.original_filename ?? "");
}

/** Larger images are stored and downloadable, but not thumbnailed. */
export const IMAGE_THUMBNAIL_MAX_BYTES = 80 * 1024 * 1024;

export async function processMediaRecord(media: MediaFileRecord) {
  if (!media.mime_type.startsWith("image/")) {
    return {
      width: null,
      height: null,
      // Preserve a client-supplied poster frame (videos) instead of clearing it.
      thumbnailKey: media.thumbnail_key ?? null,
      durationSeconds: null,
      status: "ready" as const,
    };
  }

  if (!isEventObjectKey(media.storage_key, media.event_id)) {
    reportForeignKey("processMediaRecord", { mediaId: media.id, eventId: media.event_id });
    throw new Error("Media key is outside its event.");
  }

  // The whole original is read into memory to make the thumbnail. A camera
  // photo is a few MB; anything this large is kept, just without a preview,
  // rather than risk taking the function down with it.
  if (Number(media.size_bytes) > IMAGE_THUMBNAIL_MAX_BYTES) {
    return { width: null, height: null, thumbnailKey: null, durationSeconds: null, status: "ready" as const };
  }

  const sourceBuffer = await getStoredObjectBuffer(media.storage_key);
  if (!sourceBuffer) {
    throw new Error("Unable to load the uploaded image from storage.");
  }

  let metadata: sharp.Metadata;
  let thumbnailBuffer: Buffer;
  try {
    const image = sharp(sourceBuffer).rotate();
    metadata = await image.metadata();
    thumbnailBuffer = await image
      .clone()
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 82,
        mozjpeg: true,
      })
      .toBuffer();
  } catch (error) {
    // The bundled sharp has no HEVC decoder, so an iPhone HEIC that reaches
    // the server (dragged in from a computer) cannot be thumbnailed. The
    // original is safely stored and downloads as-is; keep it, just without a
    // preview, instead of failing the guest's upload.
    if (isHeif(media)) {
      return {
        width: null,
        height: null,
        thumbnailKey: null,
        durationSeconds: null,
        status: "ready" as const,
      };
    }
    throw error;
  }

  const thumbnailKey = `events/${media.event_id}/thumbs/${media.id}.jpg`;
  await putStoredObject(thumbnailKey, thumbnailBuffer, "image/jpeg");

  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    thumbnailKey,
    durationSeconds: null,
    status: "ready" as const,
  };
}
