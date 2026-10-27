import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentCta, ContentShell, DocSections, EventTypeLinks } from "@/components/content-page";
import { CheckIcon } from "@/components/ui/check-icon";
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
      locale={locale as Locale}
      title={type.heroTitle}
      body={type.heroBody}
      trail={[
        { label: c.breadcrumbHome, href: `/${locale}` },
        { label: c.eventTypesLabel },
        { label: type.name },
      ]}
    >
      <DocSections sections={type.sections.map((section) => ({ title: section.title, body: <p>{section.body}</p> }))} />

      {/* The checklist on a well: what to have ready for this kind of event. */}
      <section className="shell pt-[var(--space-xl)]">
        <div className="well grid gap-y-[var(--space-md)] p-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
          <h2 className="title text-ink lg:col-span-4">{type.checklistTitle}</h2>
          <ul className="grid gap-x-[var(--gap-columns)] gap-y-2.5 sm:grid-cols-2 lg:col-span-8">
            {type.checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 leading-relaxed text-ink">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <EventTypeLinks locale={locale as Locale} exceptSlug={tip} />
      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
