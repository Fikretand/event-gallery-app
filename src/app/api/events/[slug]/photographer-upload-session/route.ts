import { NextResponse } from "next/server";

import { PHOTOGRAPHER_UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { computeTrialState, countUserMediaFiles, getAccountUsage, getEventAccountType, getOwnerEventBySlug, incrementRateLimitCount, isEventExpired, isGuestUploadWindowClosed } from "@/lib/events";
import { getUserProfile } from "@/lib/auth";
import { buildUploadGrants } from "@/lib/media";
import { isRateLimited } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UploadRequestFile } from "@/lib/types";
import { validateUploadFiles } from "@/lib/upload-validation";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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

    const { slug } = await params;
    const event = await getOwnerEventBySlug(user.id, slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.status === "archived") {
      return NextResponse.json({ error: "Restore this archived event before uploading more files." }, { status: 409 });
    }

    // The guest route has always enforced these two; this one never did, so the
    // owner could keep uploading past the window they bought. For a couple that
    // is the 30-day upload window and the 90-day gallery — the limits the One
    // Event plan is sold on. A photographer sets their own expiry and can move
    // it in event settings, which is what the message points at.
    if (isEventExpired(event)) {
      return NextResponse.json(
        { error: "This event has expired. Extend the expiry date in event settings to upload more files." },
        { status: 410 },
      );
    }

    const accountType = await getEventAccountType(user.id);
    if (isGuestUploadWindowClosed(event, accountType)) {
      return NextResponse.json(
        { error: "The upload window for this event has closed." },
        { status: 410 },
      );
    }

    if (
      await isRateLimited(
        `photographer:${user.id}:${event.id}`,
        PHOTOGRAPHER_UPLOAD_RATE_LIMIT.maxRequests,
        PHOTOGRAPHER_UPLOAD_RATE_LIMIT.windowMs,
        incrementRateLimitCount,
      )
    ) {
      return NextResponse.json({ error: "Too many upload attempts. Please wait a minute and try again." }, { status: 429 });
    }

    const payload = await request.json();
    const files = (payload.files ?? []) as UploadRequestFile[];
    validateUploadFiles(files, "photographer", event.event_settings);

    // ── Trial enforcement ─────────────────────────────────────────────────────
    const [profile, photosUsed] = await Promise.all([
      getUserProfile(supabase, user.id),
      countUserMediaFiles(user.id),
    ]);
    if (profile) {
      const trial = computeTrialState(profile.created_at, profile.plan_tier, photosUsed, profile.role, profile.subscription_status);
      if (trial.status === "expired") {
        return NextResponse.json(
          { error: "Your free trial has expired. Please upgrade your plan to continue uploading." },
          { status: 403 },
        );
      }
      if (trial.status === "active" && photosUsed >= trial.photosLimit) {
        return NextResponse.json(
          { error: `Trial photo limit reached (${trial.photosLimit} photos). Upgrade to continue uploading.` },
          { status: 403 },
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const requestedBytes = files.reduce((sum, file) => sum + Number(file.size ?? 0), 0);
    const usage = await getAccountUsage(user.id);
    if (requestedBytes > usage.liveAvailableStorageBytes) {
      return NextResponse.json(
        { error: "This account is out of available storage. Archive or permanently delete old events to free space." },
        { status: 403 },
      );
    }

    const grants = await buildUploadGrants(event, files, "photographer");

    return NextResponse.json({
      eventId: event.id,
      grants,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start photographer upload." },
      { status: 400 },
    );
  }
}
