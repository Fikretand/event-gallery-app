import { EventQr } from "@/app/dashboard/events/[slug]/qr/EventQr";
import type { Locale } from "@/lib/i18n/index";

export default async function EventQrLocalePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return <EventQr locale={locale as Locale} slug={slug} />;
}
