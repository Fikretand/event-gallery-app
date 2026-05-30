import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { DashboardHome } from "./DashboardHome";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string }>;
}) {
  await redirectIfPreferredLocale("");
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardHome locale="en" searchParams={resolved} />;
}
