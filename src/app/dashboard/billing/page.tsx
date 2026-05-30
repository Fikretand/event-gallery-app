import { DashboardBilling } from "./DashboardBilling";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  return <DashboardBilling locale="en" searchParams={resolved} />;
}
