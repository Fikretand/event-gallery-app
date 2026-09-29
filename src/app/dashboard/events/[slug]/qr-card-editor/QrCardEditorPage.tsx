import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { QrCardEditor } from "@/components/qr-card-editor";
import { getRequiredUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import { eventLinks, getOwnerEventBySlug } from "@/lib/events";
import { getDictionary, localePrefix, type Locale } from "@/lib/i18n/index";
import { formatDate } from "@/lib/utils";

/** Shared by the English and locale-prefixed editor routes. */
export async function QrCardEditorPage({
  locale,
  slug,
  template,
}: {
  locale: Locale;
  slug: string;
  template?: string;
}) {
  if (!hasSupabase) notFound();

  const { user } = await getRequiredUser();
  const event = await getOwnerEventBySlug(user.id, slug);
  if (!event) notFound();

  const qrDataUrl = await QRCode.toDataURL(eventLinks(slug).uploadUrl, {
    width: 1200,
    margin: 1,
    color: { dark: "#172033", light: "#fffaf2" },
  });

  return (
    <QrCardEditor
      slug={event.slug}
      eventTitle={event.title || "Confetti"}
      eventDate={event.event_date ? formatDate(event.event_date.slice(0, 10), locale) : null}
      qrDataUrl={qrDataUrl}
      backHref={`${localePrefix(locale)}/dashboard/events/${event.slug}/qr`}
      strings={getDictionary(locale).dashboard.qrCard.editor}
      initialTemplateId={template}
    />
  );
}
