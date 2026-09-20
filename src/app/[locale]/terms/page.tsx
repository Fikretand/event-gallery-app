import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal-doc-view";
import { getLegalDoc } from "@/lib/legal";
import { publicMetadata } from "@/lib/seo";
import { getDictionary, type Locale } from "@/lib/i18n/index";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getDictionary(locale as Locale).seo.terms;
  return publicMetadata({
    locale: locale as Locale,
    path: "/terms",
    title: seo.title,
    description: seo.description,
  });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <LegalDocView doc={getLegalDoc(locale as Locale, "terms")} locale={locale as Locale} />;
}
