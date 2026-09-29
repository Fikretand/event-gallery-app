import QRCode from "qrcode";

import { QrCardOverview } from "@/components/qr-card-overview";
import { getOwnerEventContext } from "@/lib/event-context";
import { eventLinks, generateUploadQrDataUrl } from "@/lib/events";
import { getDictionary, localePrefix, type Locale } from "@/lib/i18n/index";
import { formatDate } from "@/lib/utils";

/**
 * The event's QR card: see it first, then download it or open the editor.
 * The menu used to drop the owner straight into the full-screen editor.
 */
export async function EventQr({ locale, slug }: { locale: Locale; slug: string }) {
  const dict = getDictionary(locale);
  const d = dict.dashboard;
  const prefix = localePrefix(locale);

  const { event } = await getOwnerEventContext(slug);
  const links = eventLinks(event.slug);

  const [plainQr, cardQr] = await Promise.all([
    generateUploadQrDataUrl(event.slug),
    // The same code the editor places on the card: large, on the card's paper tone.
    QRCode.toDataURL(links.uploadUrl, { width: 1200, margin: 1, color: { dark: "#172033", light: "#fffaf2" } }),
  ]);

  return (
    <QrCardOverview
      slug={event.slug}
      card={{
        title: event.title || "Confetti",
        date: event.event_date ? formatDate(event.event_date.slice(0, 10), locale) : null,
        qrDataUrl: cardQr,
      }}
      plainQrDataUrl={plainQr}
      uploadUrl={links.uploadUrl}
      editorHref={`${prefix}/dashboard/events/${event.slug}/qr-card-editor`}
      strings={d.qrCard.page}
      qrHint={d.event.qrSharingHint}
    />
  );
}
