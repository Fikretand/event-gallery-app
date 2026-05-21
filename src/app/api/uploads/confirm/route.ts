import { NextResponse } from "next/server";

import { processMediaById, recordCompletedUpload } from "@/lib/events";
import { verifyUploadConfirmToken } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const objectKey = String(payload.objectKey);
    const confirmToken = String(payload.confirmToken ?? "");

    if (!verifyUploadConfirmToken(objectKey, confirmToken)) {
      return NextResponse.json({ error: "Invalid confirm token." }, { status: 403 });
    }

    const media = await recordCompletedUpload({
      eventId: String(payload.eventId),
      objectKey,
      originalFilename: String(payload.originalFilename),
      mimeType: String(payload.mimeType),
      sizeBytes: Number(payload.sizeBytes),
      sourceType: payload.sourceType,
    });

    await processMediaById(media.id);

    return NextResponse.json({ mediaId: media.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm upload." },
      { status: 400 },
    );
  }
}
