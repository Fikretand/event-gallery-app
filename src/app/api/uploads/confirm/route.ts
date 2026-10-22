import { NextResponse } from "next/server";

import { findMediaByStorageKey, getEventSettingsById, processMediaById, recordCompletedUpload } from "@/lib/events";
import { verifyUploadConfirmToken } from "@/lib/security";
import { deleteStoredObject, headStoredObject } from "@/lib/storage";
import type { MediaSourceType } from "@/lib/types";
import { checkStoredUpload } from "@/lib/upload-validation";
import { purposeFromObjectKey } from "@/lib/video-messages";

// Object keys are minted as `events/{eventId}/{guest|photographer}/…` by the
// presign route. Because the confirm token signs the key, deriving the event +
// source from the key (instead of trusting the request body) stops a caller
// from confirming a presigned upload against a different event or spoofing its
// source type.
const OBJECT_KEY_RE = /^events\/([^/]+)\/(guest|photographer)\//;

// Media/render work (sharp, resvg, pdf, zip) can exceed the 10s default.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const objectKey = String(payload.objectKey);
    const confirmToken = String(payload.confirmToken ?? "");

    if (!verifyUploadConfirmToken(objectKey, confirmToken)) {
      return NextResponse.json({ error: "Invalid or expired confirm token." }, { status: 403 });
    }

    const match = OBJECT_KEY_RE.exec(objectKey);
    if (!match) {
      return NextResponse.json({ error: "Malformed object key." }, { status: 400 });
    }
    const eventId = match[1];
    const sourceType = match[2] as MediaSourceType;


    // Optional client-extracted video poster frame. Accept only if its own
    // signed grant verifies and it belongs to the same event; otherwise ignore
    // it (the upload still succeeds, just without a thumbnail).
    let thumbnailKey: string | null = null;
    const rawThumbKey = payload.thumbnailKey ? String(payload.thumbnailKey) : "";
    const rawThumbToken = payload.thumbnailConfirmToken ? String(payload.thumbnailConfirmToken) : "";
    if (
      rawThumbKey &&
      rawThumbToken &&
      rawThumbKey.startsWith(`events/${eventId}/`) &&
      verifyUploadConfirmToken(rawThumbKey, rawThumbToken)
    ) {
      thumbnailKey = rawThumbKey;
    }

    // A repeated confirm (a retry after a lost answer, or a replayed grant)
    // gets the row that already exists: no duplicate, no second processing.
    const existing = await findMediaByStorageKey(objectKey);
    if (existing) {
      return NextResponse.json({ mediaId: existing.id });
    }

    // Size and type come from what R2 holds, not from the request: a guest
    // could otherwise confirm a 2 MB photo as 9e18 bytes and fill the owner's
    // quota, or store bytes the event does not accept.
    const stored = await headStoredObject(objectKey);
    if (!stored) {
      return NextResponse.json({ error: "The file has not arrived yet." }, { status: 409 });
    }
    const purpose = purposeFromObjectKey(objectKey);
    const verdict = checkStoredUpload(stored, sourceType, await getEventSettingsById(eventId), purpose);
    if (verdict !== "ok") {
      await deleteStoredObject(objectKey).catch(() => {});
      console.error("[upload-confirm] stored object refused", { objectKey, verdict, size: stored.size, type: stored.contentType });
      return NextResponse.json(
        { error: verdict === "too_large" ? "The file is larger than this event allows." : "This file type is not accepted." },
        { status: verdict === "too_large" ? 413 : 415 },
      );
    }

    const media = await recordCompletedUpload({
      eventId,
      objectKey,
      originalFilename: String(payload.originalFilename),
      mimeType: stored.contentType.split(";")[0].trim().toLowerCase(),
      sizeBytes: stored.size,
      purpose,
      sourceType,
      uploadSessionId: payload.uploadSessionId ? String(payload.uploadSessionId) : null,
      thumbnailKey,
    });

    // The file is stored and recorded at this point. A thumbnail that cannot
    // be made is not a failed upload: reporting it as one sends the guest to
    // upload the same photo again. processMediaById already marks the row.
    try {
      await processMediaById(media.id);
    } catch (processError) {
      console.error("[upload-confirm] processing failed", {
        mediaId: media.id,
        error: processError instanceof Error ? processError.message : String(processError),
      });
    }

    return NextResponse.json({ mediaId: media.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm upload." },
      { status: 400 },
    );
  }
}
