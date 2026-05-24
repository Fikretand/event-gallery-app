import { NextResponse } from "next/server";

import { GUEST_UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { buildUploadGrants } from "@/lib/media";
import { computeTrialState, countUserMediaFiles, createGuestUploadSession, getAccountUsage, getEventAccountType, getPublicEventBySlug, incrementRateLimitCount, isEventExpired, isGuestUploadWindowClosed } from "@/lib/events";
import { getUserProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { hashIp, verifyPin } from "@/lib/security";
import type { UploadRequestFile } from "@/lib/types";
import { validateUploadFiles } from "@/lib/upload-validation";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const event = await getPublicEventBySlug(slug);

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.status === "archived") {
      return NextResponse.json({ error: "This event is archived and no longer accepts uploads." }, { status: 410 });
    }

    if (isEventExpired(event)) {
      return NextResponse.json({ error: "This event has expired." }, { status: 410 });
    }

    const accountType = await getEventAccountType(event.owner_user_id);
    if (isGuestUploadWindowClosed(event, accountType)) {
      return NextResponse.json({ error: "Guest uploads are closed for this event." }, { status: 410 });
    }

    if (!event.event_settings?.allow_guest_upload) {
      return NextResponse.json({ error: "Guest uploads are disabled for this event." }, { status: 403 });
    }

    const payload = await request.json();
    const files = (payload.files ?? []) as UploadRequestFile[];

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rateLimitKey = `${slug}:${ip}`;

    if (
      await isRateLimited(
        rateLimitKey,
        GUEST_UPLOAD_RATE_LIMIT.maxRequests,
        GUEST_UPLOAD_RATE_LIMIT.windowMs,
        incrementRateLimitCount,
      )
    ) {
      return NextResponse.json({ error: "Too many upload attempts. Please wait a minute and try again." }, { status: 429 });
    }

    if (event.event_settings.require_pin_for_upload && !verifyPin(String(payload.pin ?? ""), event.upload_pin_hash)) {
      return NextResponse.json({ error: "Incorrect upload PIN." }, { status: 403 });
    }

    validateUploadFiles(files, "guest", event.event_settings);

    if (accountType === "photographer") {
      // ── Trial enforcement for event owner ──────────────────────────────────
      const adminClient = createSupabaseAdminClient();
      if (adminClient) {
        const [ownerProfile, photosUsed] = await Promise.all([
          adminClient.from("users").select("*").eq("id", event.owner_user_id).maybeSingle().then(r => r.data),
          countUserMediaFiles(event.owner_user_id),
        ]);
        if (ownerProfile) {
          const trial = computeTrialState(ownerProfile.created_at, ownerProfile.plan_tier, photosUsed, ownerProfile.role, ownerProfile.subscription_status);
          if (trial.status === "expired") {
            return NextResponse.json(
              { error: "The event host's free trial has expired. Please contact the event organiser." },
              { status: 403 },
            );
          }
          if (trial.status === "active" && photosUsed >= trial.photosLimit) {
            return NextResponse.json(
              { error: "The event host has reached their trial photo limit. Please contact the event organiser." },
              { status: 403 },
            );
          }
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      const requestedBytes = files.reduce((sum, file) => sum + Number(file.size ?? 0), 0);
      const usage = await getAccountUsage(event.owner_user_id);
      if (requestedBytes > usage.liveAvailableStorageBytes) {
        return NextResponse.json(
          { error: "This photographer account is out of available storage. Please contact the event owner." },
          { status: 403 },
        );
      }
    }

    const [uploadSession, grants] = await Promise.all([
      createGuestUploadSession({
        eventId: event.id,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        ipHash: hashIp(ip),
      }),
      buildUploadGrants(event, files, "guest"),
    ]);

    return NextResponse.json({
      eventId: event.id,
      uploadSessionId: uploadSession.id,
      grants,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start guest upload." },
      { status: 400 },
    );
  }
}
