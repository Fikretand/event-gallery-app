import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { CoupleDashboard } from "./CoupleDashboard";

export default async function CoupleDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ paid?: string }>;
}) {
  await redirectIfPreferredLocale("/couple");
  const resolved = searchParams ? await searchParams : undefined;
  return <CoupleDashboard locale="en" searchParams={resolved} />;
}
