import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { QrCardEditor } from "@/components/qr-card-editor";
import { getRequiredUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import { eventLinks, getOwnerEventBySlug } from "@/lib/events";
import { formatDate } from "@/lib/utils";

export default async function QrCardEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!hasSupabase) notFound();

  const { user } = await getRequiredUser();
  const event = await getOwnerEventBySlug(user.id, slug);
  if (!event) notFound();

  const qrDataUrl = await QRCode.toDataURL(eventLinks(slug).uploadUrl, {
    width: 800,
    margin: 1,
    color: { dark: "#172033", light: "#fffaf2" },
  });

  return (
    <QrCardEditor
      slug={event.slug}
      eventTitle={event.title || "Confetti"}
      eventDate={event.event_date ? formatDate(event.event_date) : null}
      qrDataUrl={qrDataUrl}
      backHref={`/dashboard/events/${event.slug}`}
    />
  );
}
