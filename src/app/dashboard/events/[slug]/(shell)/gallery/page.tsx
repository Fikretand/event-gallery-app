import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { EventGallery } from "./EventGallery";

export default async function EventGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await redirectIfPreferredLocale(`/events/${slug}/gallery`);
  return <EventGallery locale="en" slug={slug} />;
}
