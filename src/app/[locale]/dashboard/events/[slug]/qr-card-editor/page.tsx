import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { QrCardEditor } from "@/components/qr-card-editor";
import { getRequiredUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import { eventLinks, getOwnerEventBySlug } from "@/lib/events";
import { localePrefix, type Locale } from "@/lib/i18n/index";
import { formatDate } from "@/lib/utils";

export default async function QrCardEditorLocalePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasSupabase) notFound();

  const { user } = await getRequiredUser();
  const event = await getOwnerEventBySlug(user.id, slug);
  if (!event) notFound();

  const qrDataUrl = await QRCode.toDataURL(eventLinks(slug).uploadUrl, {
    width: 800,
    margin: 1,
    color: { dark: "#172033", light: "#fffaf2" },
  });

  const prefix = localePrefix(locale as Locale);

  return (
    <QrCardEditor
      slug={event.slug}
      eventTitle={event.title || "Confetti"}
      eventDate={event.event_date ? formatDate(event.event_date) : null}
      qrDataUrl={qrDataUrl}
      backHref={`${prefix}/dashboard/events/${event.slug}`}
    />
  );
}
