import { EventDetail } from "./EventDetail";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <EventDetail locale="en" slug={slug} searchParams={resolved} />;
}
