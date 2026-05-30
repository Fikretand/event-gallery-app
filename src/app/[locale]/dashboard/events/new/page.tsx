import { NewEvent } from "@/app/dashboard/events/new/NewEvent";
import type { Locale } from "@/lib/i18n/index";

export default async function NewEventLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ intent?: string }>;
}) {
  const { locale } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <NewEvent locale={locale as Locale} searchParams={resolved} />;
}
