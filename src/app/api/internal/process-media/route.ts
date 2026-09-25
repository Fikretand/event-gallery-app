import { NextResponse } from "next/server";

import { processMediaById } from "@/lib/events";
import { isInternalRequest } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Media/render work (sharp, resvg, pdf, zip) can exceed the 10s default.
export const maxDuration = 60;

/** How many stuck files one run takes on, so a backlog cannot outlast maxDuration. */
const BATCH = 25;

/**
 * Leave anything younger than this alone: /api/uploads/confirm processes each
 * upload inline, and a fresh row is most likely still in its hands. Fifteen
 * minutes is far past the 60-second limit, so an older "processing" row is dead.
 */
const STUCK_AFTER_MS = 15 * 60 * 1000;

/**
 * Recover uploads whose inline processing failed.
 *
 * Every upload is processed as it is confirmed; this is the backstop for the
 * ones where that never finished. Two states mean that: "uploaded" (processing
 * never started) and "processing" (it started, and the function was killed at
 * maxDuration before it could record either outcome — nothing would ever touch
 * that row again). A genuine failure is marked "failed" by processMediaById and
 * is not retried here, so a corrupt file cannot hold a batch slot for ever. It existed before but nothing called it: it answered only
 * POST with an x-worker-secret header, while Vercel Cron sends GET with a bearer
 * token. It is now in vercel.json and accepts both.
 *
 * One bad file no longer stops the batch: each is processed on its own and
 * failures are counted rather than thrown.
 */
async function handle(request: Request) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const { data: items, error } = await admin
    .from("media_files")
    .select("id")
    .in("status", ["uploaded", "processing"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  const failed: string[] = [];
  for (const { id } of items ?? []) {
    try {
      await processMediaById(id);
      processed += 1;
    } catch (cause) {
      failed.push(id);
      console.error("[process-media] could not recover", id, cause);
    }
  }

  return NextResponse.json({ processed, failed: failed.length });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
