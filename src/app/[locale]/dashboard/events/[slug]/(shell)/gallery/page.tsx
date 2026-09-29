import { EventGallery } from "@/app/dashboard/events/[slug]/(shell)/gallery/EventGallery";
import type { Locale } from "@/lib/i18n/index";

export default async function EventGalleryLocalePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return <EventGallery locale={locale as Locale} slug={slug} />;
}
