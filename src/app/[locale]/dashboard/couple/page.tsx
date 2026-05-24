import { CoupleDashboard } from "@/app/dashboard/couple/CoupleDashboard";
import type { Locale } from "@/lib/i18n/index";

export default async function CoupleDashboardLocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CoupleDashboard locale={locale as Locale} />;
}
