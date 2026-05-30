import { DashboardProfile } from "@/app/dashboard/profile/DashboardProfile";
import type { Locale } from "@/lib/i18n/index";

export default async function DashboardProfileLocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <DashboardProfile locale={locale as Locale} />;
}
