import { LegalDocView } from "@/components/legal-doc-view";
import { getLegalDoc } from "@/lib/legal";
import type { Locale } from "@/lib/i18n/index";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <LegalDocView doc={getLegalDoc(locale as Locale, "terms")} locale={locale as Locale} />;
}
