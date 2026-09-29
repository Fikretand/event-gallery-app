import { EventDetail } from "@/app/dashboard/events/[slug]/(shell)/EventDetail";
import type { Locale } from "@/lib/i18n/index";

export default async function EventDetailLocalePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return <EventDetail locale={locale as Locale} slug={slug} />;
}
