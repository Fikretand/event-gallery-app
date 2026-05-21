import { NextResponse } from "next/server";

import { recordEventActivity } from "@/lib/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    if (!admin) {
      return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { slug } = await params;
    const payload = (await request.json()) as { coverImageId?: string | null };
    const coverImageId = payload.coverImageId ?? null;

    const { data: event } = await supabase
      .from("events")
      .select("id, owner_user_id")
      .eq("slug", slug)
      .eq("owner_user_id", user.id)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (coverImageId) {
      const { data: media } = await admin
        .from("media_files")
        .select("id, event_id, mime_type")
        .eq("id", coverImageId)
        .single();

      if (!media || media.event_id !== event.id) {
        return NextResponse.json({ error: "Cover image must belong to this event." }, { status: 400 });
      }

      if (!String(media.mime_type).startsWith("image/")) {
        return NextResponse.json({ error: "Only images can be used as a cover." }, { status: 400 });
      }
    }

    const { data: updated, error } = await supabase
      .from("events")
      .update({
        cover_image_id: coverImageId,
      })
      .eq("id", event.id)
      .eq("owner_user_id", user.id)
      .select("cover_image_id")
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? "Failed to update event cover." }, { status: 400 });
    }

    await recordEventActivity({
      eventId: event.id,
      actorUserId: user.id,
      mediaFileId: coverImageId,
      action: coverImageId ? "cover_set" : "cover_cleared",
      metadata: {
        coverImageId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update event cover." },
      { status: 400 },
    );
  }
}
