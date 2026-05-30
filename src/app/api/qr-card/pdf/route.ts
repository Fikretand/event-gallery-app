import { NextResponse } from "next/server";

import { renderPosterPdf } from "@/lib/qr-posters-render";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Wrap a PNG data URL from the QR card editor into an A4 PDF.
 *
 * Auth-only (no event ownership check needed — the PNG is fully client-side
 * rendered + supplied by the same logged-in user; we're only providing the
 * wrapper service).
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const pngDataUrl: unknown = body.pngDataUrl;
  const filename: string =
    typeof body.filename === "string" ? body.filename : "confetti-card.pdf";

  if (typeof pngDataUrl !== "string" || !pngDataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Invalid PNG payload." }, { status: 400 });
  }

  const b64 = pngDataUrl.slice("data:image/png;base64,".length);
  const png = Buffer.from(b64, "base64");

  // Bound the input — A4 @ 300 DPI = ~2.5 MB max; allow 10 MB to be safe.
  if (png.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "PNG too large." }, { status: 413 });
  }

  const pdf = await renderPosterPdf(png);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
