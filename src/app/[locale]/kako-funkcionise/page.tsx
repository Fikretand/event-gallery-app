import type { Metadata } from "next";

import { ContentCta, ContentShell, EventTypeLinks } from "@/components/content-page";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const h = getDictionary(locale as Locale).content.howItWorks;
  return publicMetadata({
    locale: locale as Locale,
    path: "/kako-funkcionise",
    title: h.seoTitle,
    description: h.seoDescription,
  });
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getDictionary(locale as Locale).content;
  const h = c.howItWorks;

  return (
    <ContentShell
      locale={locale as Locale}
      title={h.title}
      body={h.body}
      trail={[{ label: c.breadcrumbHome, href: `/${locale}` }, { label: h.seoTitle }]}
    >
      {/* The four steps as a real ordered list, each in the long-document
          row: the numeral and title in the margin, the text beside. */}
      <ol className="shell">
        {h.steps.map((step) => (
          <li
            key={step.n}
            className="grid gap-y-[var(--space-sm)] border-t border-rule py-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]"
          >
            <div className="flex items-baseline gap-4 lg:col-span-4">
              <span className="num font-display text-[length:var(--text-display-s)] font-semibold leading-none text-accent">{Number(step.n)}</span>
              <h2 className="title text-ink">{step.title}</h2>
            </div>
            <p className="max-w-[65ch] text-[1.0625rem] leading-[1.7] text-ink-2 lg:col-span-7 lg:col-start-6">{step.body}</p>
          </li>
        ))}
      </ol>

      <section className="shell pt-[var(--space-lg)]">
        <p className="notice notice-success max-w-[80ch] text-[0.9375rem]">{h.note}</p>
      </section>

      <EventTypeLinks locale={locale as Locale} />
      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
