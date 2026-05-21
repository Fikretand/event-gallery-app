import { NextResponse } from "next/server";

import { canViewGallery, getOwnerEventBySlug, getPublicEventBySlug, listEventMedia } from "@/lib/events";
import { enrichMediaWithUrls } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const { slug } = await params;

  if (mode === "owner") {
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

    const event = await getOwnerEventBySlug(user.id, slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const media = await listEventMedia(event.id, {
      includeHidden: true,
      includeDeleted: true,
      sourceType: "all",
    }).then(enrichMediaWithUrls);
    return NextResponse.json({ media });
  }

  const event = await getPublicEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const access = await canViewGallery(event);
  if (!access) {
    return NextResponse.json({ error: "Gallery access denied." }, { status: 403 });
  }

  const media = await listEventMedia(event.id, { includeHidden: false, sourceType: "all" }).then(enrichMediaWithUrls);
  return NextResponse.json({ media });
}
