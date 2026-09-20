import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentCta, ContentShell, EventTypeLinks } from "@/components/content-page";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { Panel } from "@/components/ui/panel";
import { getDictionary, locales, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

/**
 * One page per kind of event.
 *
 * A shared route rather than five near-identical files, because the layout is
 * genuinely the same and the copy is genuinely different. What this is *not*
 * is a generated matrix: there are five of these, each written by hand, and
 * deliberately no city variants — "wedding gallery Sarajevo / Mostar / Tuzla"
 * pages differing by one word are doorway pages, and Google treats them as
 * such.
 */

/** Slugs are ASCII with diacritics transliterated, and identical in both languages. */
export function generateStaticParams() {
  const slugs = getDictionary("bs").content.eventTypes.map((t) => t.slug);
  return locales.flatMap((locale) => slugs.map((tip) => ({ locale, tip })));
}

function findType(locale: Locale, tip: string) {
  return getDictionary(locale).content.eventTypes.find((t) => t.slug === tip);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tip: string }>;
}): Promise<Metadata> {
  const { locale, tip } = await params;
  const type = findType(locale as Locale, tip);
  if (!type) return {};

  return publicMetadata({
    locale: locale as Locale,
    path: `/dogadjaji/${tip}`,
    title: type.seoTitle,
    description: type.seoDescription,
  });
}

export default async function EventTypePage({
  params,
}: {
  params: Promise<{ locale: string; tip: string }>;
}) {
  const { locale, tip } = await params;
  const type = findType(locale as Locale, tip);
  if (!type) notFound();

  const c = getDictionary(locale as Locale).content;

  return (
    <ContentShell
      title={type.heroTitle}
      body={type.heroBody}
      trail={[
        { label: c.breadcrumbHome, href: `/${locale}` },
        { label: c.eventTypesLabel },
        { label: type.name },
      ]}
    >
      <section className="shell grid gap-5 py-4 md:grid-cols-3">
        {type.sections.map((section) => (
          <div key={section.title} className="rounded-[24px] border border-black/8 bg-white/80 p-6">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">{section.title}</h2>
            <p className="mt-2.5 text-sm leading-6 text-black/65">{section.body}</p>
          </div>
        ))}
      </section>

      <section className="shell py-6">
        <Panel className="bg-white/85">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            {type.checklistTitle}
          </h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {type.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-black/70">
                <span className="mt-0.5 text-[var(--color-moss)]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <MarketingTrustStrip locale={locale as Locale} />
      <EventTypeLinks locale={locale as Locale} exceptSlug={tip} />
      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
