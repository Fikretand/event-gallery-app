import { EventDetail } from "@/app/dashboard/events/[slug]/EventDetail";
import type { Locale } from "@/lib/i18n/index";

export default async function EventDetailLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { locale, slug } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <EventDetail locale={locale as Locale} slug={slug} searchParams={resolved} />;
}
