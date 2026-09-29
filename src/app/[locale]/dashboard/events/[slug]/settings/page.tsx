import { EventSettings } from "@/app/dashboard/events/[slug]/settings/EventSettings";
import type { Locale } from "@/lib/i18n/index";

export default async function EventSettingsLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { locale, slug } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <EventSettings locale={locale as Locale} slug={slug} searchParams={resolved} />;
}
