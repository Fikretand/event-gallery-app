import { NextResponse } from "next/server";

import { purgeExpiredDeletedMedia } from "@/lib/events";
import { isInternalRequest } from "@/lib/internal-auth";

async function handlePurge(request: Request) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const purgedCount = await purgeExpiredDeletedMedia(7);
    return NextResponse.json({ ok: true, purgedCount });
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
