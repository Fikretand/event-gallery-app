import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { EventDetail } from "./EventDetail";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  await redirectIfPreferredLocale(`/events/${slug}`);
  const resolved = searchParams ? await searchParams : undefined;
  return <EventDetail locale="en" slug={slug} searchParams={resolved} />;
}
