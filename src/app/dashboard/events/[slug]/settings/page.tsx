import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { EventSettings } from "./EventSettings";

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  await redirectIfPreferredLocale(`/events/${slug}/settings`);
  const resolved = searchParams ? await searchParams : undefined;
  return <EventSettings locale="en" slug={slug} searchParams={resolved} />;
}
