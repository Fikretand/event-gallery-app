import { NewEvent } from "./NewEvent";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  return <NewEvent locale="en" searchParams={resolved} />;
}
