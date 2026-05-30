import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { DashboardProfile } from "./DashboardProfile";

export default async function DashboardProfilePage() {
  await redirectIfPreferredLocale("/profile");
  return <DashboardProfile locale="en" />;
}
