import { NextResponse } from "next/server";

import { getPublicEventBySlug } from "@/lib/events";
import { listLiveSlides, resolveLiveAccess } from "@/lib/live-slides";

/**
 * Slides for the venue live view, polled every few seconds by the screen.
 * Same access as the public gallery; unreviewed guest uploads only for the
 * owner, and only when they ask for them.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const access = await resolveLiveAccess(event);
  if (!access) {
    return NextResponse.json({ error: "Gallery access denied." }, { status: 403 });
  }

  const wantsPending = new URL(request.url).searchParams.get("pending") === "1";
  const slides = await listLiveSlides(event.id, wantsPending && access === "owner");

  return NextResponse.json({ slides }, { headers: { "Cache-Control": "private, no-store" } });
}
