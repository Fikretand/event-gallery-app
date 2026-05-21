import { NextResponse } from "next/server";

import { generateUploadQrDataUrl, getPublicEventBySlug } from "@/lib/events";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const qrCode = await generateUploadQrDataUrl(slug);
  return NextResponse.json({ qrCode });
}
