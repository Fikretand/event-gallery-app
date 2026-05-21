import { NextResponse } from "next/server";

import { PHOTOGRAPHER_UPLOAD_RATE_LIMIT } from "@/lib/constants";
import { getAccountUsage, getOwnerEventBySlug, incrementRateLimitCount } from "@/lib/events";
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
