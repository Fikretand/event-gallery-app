import JSZip from "jszip";
import { NextResponse } from "next/server";

import { canViewGallery, getMediaById, recordDownload } from "@/lib/events";
import { getStoredObjectBuffer } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function zipEntryName(filename: string, usedNames: Map<string, number>) {
  const cleaned = filename.trim() || "file";
  const match = cleaned.match(/^(.*?)(\.[^.]+)?$/);
  const base = (match?.[1] || "file").trim() || "file";
  const ext = match?.[2] || "";
  const current = usedNames.get(cleaned) ?? 0;

  if (current === 0) {
    usedNames.set(cleaned, 1);
    return cleaned;
  }

  const next = current + 1;
  usedNames.set(cleaned, next);
  return `${base}-${next}${ext}`;
}

function zipFilename(eventSlug: string) {
  return `${eventSlug}-gallery.zip`;
}

// Media/render work (sharp, resvg, pdf, zip) can exceed the 10s default.
export const maxDuration = 60;

// Ceiling on a single ZIP request. The route buffers every original *and* the
// finished archive, so peak memory is ~2x this — keep it comfortably inside
// the serverless memory limit.
const ZIP_MAX_TOTAL_BYTES = 300 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((value) => typeof value === "string") : [];

    if (ids.length < 2) {
      return NextResponse.json({ error: "Select at least two files to create a ZIP." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

    const mediaList = await Promise.all(ids.map((id) => getMediaById(id)));
    if (mediaList.some((item) => !item)) {
      return NextResponse.json({ error: "One or more files could not be found." }, { status: 404 });
    }

    const resolvedMedia = mediaList.filter(Boolean);
    const firstEventId = resolvedMedia[0]?.event.id;

    if (!firstEventId || resolvedMedia.some((item) => item.event.id !== firstEventId)) {
      return NextResponse.json({ error: "Selected files must belong to the same event." }, { status: 400 });
    }

    const ownerUserId = resolvedMedia[0]?.event.owner_user_id;
    const isOwner = Boolean(user?.id && ownerUserId === user.id);

    if (!isOwner) {
      const publicAccessChecks = await Promise.all(
        resolvedMedia.map((item) => {
          if (item.hidden_at) {
            return false;
          }

          return canViewGallery({
            ...item.event,
            event_settings: item.event.event_settings,
          });
        }),
      );

      if (publicAccessChecks.some((allowed) => !allowed)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    // The archive is assembled entirely in memory: every original is buffered,
    // then JSZip builds the finished ZIP alongside them. Peak usage is roughly
    // twice the selection, so a large gallery would OOM the function and
    // surface as an opaque failure. Refuse oversized selections up front,
    // using the sizes already on the records (no I/O), and say so clearly.
    const totalBytes = resolvedMedia.reduce((sum, item) => sum + (item.size_bytes ?? 0), 0);
    if (totalBytes > ZIP_MAX_TOTAL_BYTES) {
      const totalMb = Math.round(totalBytes / (1024 * 1024));
      const limitMb = Math.round(ZIP_MAX_TOTAL_BYTES / (1024 * 1024));
      return NextResponse.json(
        {
          error: `This selection is ${totalMb} MB, over the ${limitMb} MB ZIP limit. Select fewer files and download in batches.`,
        },
        { status: 413 },
      );
    }

    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    for (const media of resolvedMedia) {
      const buffer = await getStoredObjectBuffer(media.storage_key);
      if (!buffer) {
        return NextResponse.json({ error: `Failed to read ${media.original_filename}.` }, { status: 500 });
      }

      zip.file(zipEntryName(media.original_filename, usedNames), buffer);

      await recordDownload({
        eventId: media.event.id,
        mediaFileId: media.id,
        userId: user?.id ?? null,
      });
    }

    // Generate straight to a Uint8Array — going via nodebuffer and re-wrapping
    // it copied the whole archive a second time.
    const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const filename = zipFilename(resolvedMedia[0].event.slug);

    // A Uint8Array is a valid response body at runtime; the cast only works
    // around lib.dom typing BodyInit as Uint8Array<ArrayBuffer>. Re-wrapping
    // it to satisfy the type would copy the whole archive again.
    return new NextResponse(archive as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(archive.byteLength),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ZIP archive." },
      { status: 400 },
    );
  }
}
