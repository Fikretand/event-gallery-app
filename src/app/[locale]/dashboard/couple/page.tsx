import { CoupleDashboard } from "@/app/dashboard/couple/CoupleDashboard";
import type { Locale } from "@/lib/i18n/index";

export default async function CoupleDashboardLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ paid?: string }>;
}) {
  const { locale } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <CoupleDashboard locale={locale as Locale} searchParams={resolved} />;
}
