import { DashboardHome } from "./DashboardHome";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardHome locale="en" searchParams={resolved} />;
}
