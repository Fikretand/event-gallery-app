import { DashboardBilling } from "@/app/dashboard/billing/DashboardBilling";
import type { Locale } from "@/lib/i18n/index";

export default async function BillingLocalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ success?: string }>;
}) {
  const { locale } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardBilling locale={locale as Locale} searchParams={resolved} />;
}
