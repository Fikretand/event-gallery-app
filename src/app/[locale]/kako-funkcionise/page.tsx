import type { Metadata } from "next";

import { ContentCta, ContentShell, EventTypeLinks } from "@/components/content-page";
import { Panel } from "@/components/ui/panel";
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
      title={h.title}
      body={h.body}
      trail={[{ label: c.breadcrumbHome, href: `/${locale}` }, { label: h.seoTitle }]}
    >
      <section className="shell grid gap-4 py-4 sm:grid-cols-2">
        {h.steps.map((step) => (
          <div key={step.n} className="rounded-[24px] border border-black/8 bg-white/80 p-6">
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-[var(--color-accent)]">
              {step.n}
            </p>
            <h2 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{step.title}</h2>
            <p className="mt-2.5 text-sm leading-6 text-black/65">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="shell py-4">
        <Panel className="bg-[var(--color-moss)]/6 border-[var(--color-moss)]/20">
          <p className="text-sm leading-6 text-[var(--color-moss)]">{h.note}</p>
        </Panel>
      </section>

      <EventTypeLinks locale={locale as Locale} />
      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
