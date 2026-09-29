import { redirectIfPreferredLocale } from "@/lib/i18n/preference";
import { QrCardEditorPage } from "./QrCardEditorPage";

export default async function QrCardEditorRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { slug } = await params;
  const { template } = await searchParams;
  await redirectIfPreferredLocale(`/events/${slug}/qr-card-editor${template ? `?template=${encodeURIComponent(template)}` : ""}`);
  return <QrCardEditorPage locale="en" slug={slug} template={template} />;
}
