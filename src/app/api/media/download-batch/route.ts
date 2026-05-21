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

    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const filename = zipFilename(resolvedMedia[0].event.slug);

    return new NextResponse(new Uint8Array(archive), {
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
