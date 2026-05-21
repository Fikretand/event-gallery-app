import { NextResponse } from "next/server";

import { createSignedDownloadUrl } from "@/lib/storage";
import { canViewGallery, getMediaById, recordDownload } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const media = await getMediaById(id);
    if (!media) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

    const isOwner = user?.id && media.event.owner_user_id === user.id;
    const publicAccess = media.hidden_at ? false : await canViewGallery({
      ...media.event,
      event_settings: media.event.event_settings,
    });

    if (!isOwner && !publicAccess) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = await createSignedDownloadUrl(media.storage_key, media.original_filename);
    if (!url) {
      return NextResponse.json({ error: "R2 is not configured." }, { status: 500 });
    }

    await recordDownload({
      eventId: media.event.id,
      mediaFileId: media.id,
      userId: user?.id ?? null,
    });

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create download URL." },
      { status: 400 },
    );
  }
}
