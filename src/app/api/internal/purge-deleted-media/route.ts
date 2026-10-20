import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { purgeExpiredDeletedMedia, purgeExpiredEventMedia } from "@/lib/events";
import { isInternalRequest } from "@/lib/internal-auth";

// Deleting a few hundred R2 objects one by one takes a while; the purge caps
// itself per run so it finishes inside this.
export const maxDuration = 60;

async function handlePurge(request: Request) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const purgedCount = await purgeExpiredDeletedMedia(7);
    // Runs here rather than as a third cron: the plan allows two.
    const retention = await purgeExpiredEventMedia({ dryRun: env.retentionPurge !== "on" });
    console.log("[retention]", JSON.stringify(retention));
    return NextResponse.json({ ok: true, purgedCount, retention });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to purge deleted media." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  return handlePurge(request);
}

export async function GET(request: Request) {
  return handlePurge(request);
}
