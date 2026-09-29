import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { EventQr } from "./EventQr";

export default async function EventQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await redirectIfPreferredLocale(`/events/${slug}/qr`);
  return <EventQr locale="en" slug={slug} />;
}
