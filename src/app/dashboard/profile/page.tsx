import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { DashboardProfile } from "./DashboardProfile";

export default async function DashboardProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  await redirectIfPreferredLocale("/profile");
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardProfile locale="en" searchParams={resolved} />;
}
