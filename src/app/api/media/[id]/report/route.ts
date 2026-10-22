import { NextResponse } from "next/server";

import { MEDIA_REPORT_RATE_LIMIT } from "@/lib/constants";
import { canViewGallery, getMediaById, incrementRateLimitCount } from "@/lib/events";
import { clearMediaReports, parseReportReason, recordMediaReport } from "@/lib/media-reports";
import { isRateLimited } from "@/lib/rate-limit";
import { hashIp } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST — a gallery visitor reports a file as inappropriate.
 *
 * ⚠ Unauthenticated by design: guests have no accounts. What bounds it:
 * - the caller must be able to view this gallery right now (open, unexpired,
 *   PIN unlocked), and only files the gallery shows can be reported;
 * - 10 reports per address per 15 minutes, counted atomically;
 * - one report per file per address (unique in the table);
 * - the answer says nothing about the file or other reports.
 * A report only notifies the owner; it never hides anything by itself.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
    const reporterHash = hashIp(ip) ?? "unknown";

    if (
      await isRateLimited(
        `media-report:${reporterHash}`,
        MEDIA_REPORT_RATE_LIMIT.maxRequests,
        MEDIA_REPORT_RATE_LIMIT.windowMs,
        incrementRateLimitCount,
      )
    ) {
      return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 });
    }

    const { id } = await params;
    const media = await getMediaById(id);
    // Same 404 for "no such file" and "not shown in this gallery".
    if (!media || media.hidden_at || media.deleted_at || media.event.status === "archived") {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }
    if (!(await canViewGallery({ ...media.event, event_settings: media.event.event_settings }))) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    await recordMediaReport({
      mediaId: media.id,
      eventId: media.event.id,
      reason: parseReportReason(body.reason),
      reporterHash,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[media-report] failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not send the report." }, { status: 500 });
  }
}

/** DELETE — the owner dismisses the reports on one of their files. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
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

    await clearMediaReports(media.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dismiss reports." },
      { status: 400 },
    );
  }
}
