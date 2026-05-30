import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { DashboardBilling } from "./DashboardBilling";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  await redirectIfPreferredLocale("/billing");
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardBilling locale="en" searchParams={resolved} />;
}
