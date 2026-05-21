import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processMediaById } from "@/lib/events";

export async function POST(request: Request) {
  const secret = request.headers.get("x-worker-secret");
  if (!env.mediaWorkerSecret || secret !== env.mediaWorkerSecret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const { data: items, error } = await admin
    .from("media_files")
    .select("id")
    .eq("status", "uploaded")
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (items ?? []).map((item) => item.id);
  if (ids.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  for (const id of ids) {
    await processMediaById(id);
  }

  return NextResponse.json({ processed: ids.length });
}
