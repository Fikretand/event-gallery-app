import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { NewEvent } from "./NewEvent";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  await redirectIfPreferredLocale("/events/new");
  const resolved = searchParams ? await searchParams : undefined;
  return <NewEvent locale="en" searchParams={resolved} />;
}
