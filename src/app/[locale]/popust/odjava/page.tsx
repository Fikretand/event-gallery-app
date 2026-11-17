import type { Metadata } from "next";

import { UnsubscribeForm } from "@/components/lead/unsubscribe-form";
import { SiteNav } from "@/components/site-nav";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return privateMetadata(getDictionary(locale as Locale).leadOffer.unsubTitle);
}

/**
 * The unsubscribe link in every lead email. It asks for one click instead of
 * acting on the visit itself, because mail scanners open every link in a
 * message and would unsubscribe people who never asked to be.
 */
export default async function LeadUnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale } = await params;
  const { t = "" } = await searchParams;
  const s = getDictionary(locale as Locale).leadOffer;
  return (
    <main>
      <SiteNav />
      <section className="shell max-w-2xl py-[var(--space-3xl)]">
        <h1 className="app-title text-ink">{s.unsubTitle}</h1>
        <UnsubscribeForm token={t.slice(0, 80)} strings={s} />
      </section>
    </main>
  );
}
