import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { purgeExpiredDeletedMedia } from "@/lib/events";

function isAuthorized(request: Request) {
  const workerToken = request.headers.get("x-media-worker-secret");
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const validSecrets = [env.mediaWorkerSecret, env.cronSecret].filter(Boolean);

  if (validSecrets.length === 0) {
    return false;
  }

  return validSecrets.includes(workerToken ?? "") || validSecrets.includes(bearerToken ?? "");
}

async function handlePurge(request: Request) {
  if (!isAuthorized(request)) {
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
