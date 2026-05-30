import { DashboardHome } from "@/app/dashboard/DashboardHome";
import type { Locale } from "@/lib/i18n/index";

export default async function DashboardLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ deleted?: string }>;
}) {
  const { locale } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardHome locale={locale as Locale} searchParams={resolved} />;
}
