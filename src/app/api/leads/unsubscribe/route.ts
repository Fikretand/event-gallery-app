import { NextResponse } from "next/server";

import { unsubscribeLead } from "@/lib/leads";

/**
 * ⚠ Unauthenticated: one-click unsubscribe (RFC 8058), the target of the
 * List-Unsubscribe header in every lead email. Gmail and Apple Mail POST here
 * when someone presses their built-in "Unsubscribe". The token is a random
 * 32-character secret per lead; it can only stop that lead's emails.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const ok = await unsubscribeLead(token);
  return NextResponse.json({ unsubscribed: ok }, { status: ok ? 200 : 404 });
}

/** A person who opens the header link in a browser gets the confirm page instead. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/bs/popust/odjava?t=${encodeURIComponent(token)}`, url.origin));
}
