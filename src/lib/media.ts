import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { signUploadConfirmToken } from "@/lib/security";
import { createSignedDownloadUrl, createSignedUploadUrl, getStoredObjectBuffer, publicMediaUrl, putStoredObject } from "@/lib/storage";
import type {
  EventRecord,
  MediaFileRecord,
  MediaSourceType,
  MediaView,
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

    grants.push({
      objectKey,
      uploadUrl,
      contentType: file.type,
      originalFilename: file.name,
      size: file.size,
      sourceType,
      confirmToken: signUploadConfirmToken(objectKey),
    });
  }

  return grants;
}

export async function enrichMediaWithUrls<T extends MediaFileRecord>(
  media: T[],
): Promise<(T & { previewUrl: string | null; thumbnailUrl: string | null })[]> {
  return Promise.all(
    media.map(async (item) => {
      const previewUrl = publicMediaUrl(item.storage_key) ?? (await createSignedDownloadUrl(item.storage_key));
      const thumbnailUrl =
        publicMediaUrl(item.thumbnail_key) ??
        (item.thumbnail_key ? await createSignedDownloadUrl(item.thumbnail_key) : previewUrl);

      return {
        ...item,
        previewUrl,
        thumbnailUrl,
      };
    }),
  );
}

export async function processMediaRecord(media: MediaFileRecord) {
  if (!media.mime_type.startsWith("image/")) {
    return {
      width: null,
      height: null,
      thumbnailKey: null,
      durationSeconds: null,
      status: "ready" as const,
    };
  }

  const sourceBuffer = await getStoredObjectBuffer(media.storage_key);
  if (!sourceBuffer) {
    throw new Error("Unable to load the uploaded image from storage.");
  }

  const image = sharp(sourceBuffer).rotate();
  const metadata = await image.metadata();
  const thumbnailBuffer = await image
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
