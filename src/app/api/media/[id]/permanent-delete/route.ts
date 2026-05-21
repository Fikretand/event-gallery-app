import { NextResponse } from "next/server";

import { getMediaById, permanentlyDeleteMediaById, recordEventActivity } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const media = await getMediaById(id);
    if (!media) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    if (media.event.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await recordEventActivity({
      eventId: media.event.id,
      actorUserId: user.id,
      mediaFileId: media.id,
      action: "media_permanently_deleted",
      metadata: {
        filename: media.original_filename,
      },
    });
    await permanentlyDeleteMediaById(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to permanently delete media." },
      { status: 400 },
    );
  }
}
