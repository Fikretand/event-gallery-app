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
      title={f.title}
      body={f.body}
      trail={[{ label: c.breadcrumbHome, href: `/${locale}` }, { label: f.seoTitle }]}
    >
      <section className="shell space-y-10 py-4">
        {f.groups.map((group) => (
          <div key={group.heading}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              {group.heading}
            </h2>
            <div className="mt-4 space-y-3">
              {group.items.map((item) => (
                // A native <details> keeps this readable without JavaScript,
                // which matters both for crawlers and for slow connections.
                <details
                  key={item.question}
                  className="group rounded-[20px] border border-black/8 bg-white/80 px-5 py-4"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--color-ink)] marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      {item.question}
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-black/30 transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-black/65">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>

      <EventTypeLinks locale={locale as Locale} />
      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
