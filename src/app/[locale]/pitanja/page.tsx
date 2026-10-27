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
  const f = getDictionary(locale as Locale).content.faq;
  return publicMetadata({
    locale: locale as Locale,
    path: "/pitanja",
    title: f.seoTitle,
    description: f.seoDescription,
  });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getDictionary(locale as Locale).content;
  const f = c.faq;

  return (
    <ContentShell
      locale={locale as Locale}
      title={f.title}
      body={f.body}
      trail={[{ label: c.breadcrumbHome, href: `/${locale}` }, { label: f.seoTitle }]}
    >
      <div className="shell">
        {f.groups.map((group) => (
          <section
            key={group.heading}
            className="grid gap-y-[var(--space-sm)] border-t border-rule py-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]"
          >
            <h2 className="title text-ink lg:col-span-4">{group.heading}</h2>
            <div className="lg:col-span-8">
              {group.items.map((item) => (
                // A native <details> keeps this readable without JavaScript,
                // which matters both for crawlers and for slow connections.
                <details key={item.question} className="group border-b border-rule last:border-b-0">
                  <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-6 py-[var(--space-md)] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-2 transition-transform duration-[var(--dur-short)] group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M10 4v12M4 10h12" />
                    </svg>
                  </summary>
                  <p className="max-w-[65ch] pb-[var(--space-md)] pr-10 leading-[1.7] text-ink-2">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <EventTypeLinks locale={locale as Locale} />
      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
