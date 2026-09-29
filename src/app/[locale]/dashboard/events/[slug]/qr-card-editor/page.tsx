import { QrCardEditorPage } from "@/app/dashboard/events/[slug]/qr-card-editor/QrCardEditorPage";
import type { Locale } from "@/lib/i18n/index";

export default async function QrCardEditorLocaleRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { locale, slug } = await params;
  const { template } = await searchParams;
  return <QrCardEditorPage locale={locale as Locale} slug={slug} template={template} />;
}
