import { NextResponse } from "next/server";
import QRCode from "qrcode";

import {
  isPosterFormat,
  isPosterTemplate,
  renderPosterSvg,
  type PosterData,
} from "@/lib/qr-posters";
import { getPosterFontPaths } from "@/lib/qr-posters-fonts";
import { renderPosterPdf, renderPosterPng } from "@/lib/qr-posters-render";
import { eventLinks, getOwnerEventBySlug } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

/**
 * Render a printable QR poster for an event.
 *
 * Query params:
 *   template = minimal-cream | confetti-burst | polaroid | editorial
 *   format   = png | pdf  (default: png)
 *
 * Auth: required + must own the event.
 */
// Media/render work (sharp, resvg, pdf, zip) can exceed the 10s default.
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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

  const event = await getOwnerEventBySlug(user.id, slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const templateParam = url.searchParams.get("template");
  const formatParam = url.searchParams.get("format") ?? "png";

  if (!isPosterTemplate(templateParam)) {
    return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  }
  if (!isPosterFormat(formatParam)) {
    return NextResponse.json({ error: "Invalid format." }, { status: 400 });
  }

  // Generate a high-res QR (the SVG embeds it as a base64 PNG image).
  const links = eventLinks(event.slug);
  const qrDataUrl = await QRCode.toDataURL(links.uploadUrl, {
    width: 800,
    margin: 1,
    color: { dark: "#172033", light: "#fffaf2" },
  });

  const data: PosterData = {
    title: event.title || "Confetti",
    date: event.event_date ? formatDate(event.event_date) : null,
    uploadUrl: links.uploadUrl,
    qrDataUrl,
  };

  const svg = renderPosterSvg(templateParam, data);
  const png = renderPosterPng(svg, getPosterFontPaths());

  const filenameBase = `confetti-${event.slug}-${templateParam}`;

  if (formatParam === "pdf") {
    const pdf = await renderPosterPdf(png);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filenameBase}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
