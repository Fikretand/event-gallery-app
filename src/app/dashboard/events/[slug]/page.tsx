import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { EventDetail } from "./EventDetail";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await redirectIfPreferredLocale(`/events/${slug}`);
  return <EventDetail locale="en" slug={slug} />;
}
