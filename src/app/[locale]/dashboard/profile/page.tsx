import { DashboardProfile } from "@/app/dashboard/profile/DashboardProfile";
import type { Locale } from "@/lib/i18n/index";

export default async function DashboardProfileLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardProfile locale={locale as Locale} searchParams={resolved} />;
}
