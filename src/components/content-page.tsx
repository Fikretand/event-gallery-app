import Link from "next/link";

import { AudienceCtas } from "@/components/audience-ctas";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getDictionary, type Locale } from "@/lib/i18n/index";

/**
 * Shared chrome for the standalone content pages.
 *
 * They all want the same things — a trail back up, one `<h1>`, sections set
 * as a long document (the heading in the margin, the text at a reading
 * measure), and a closing call to action — and having them in one place is
 * what keeps the pages from drifting into slightly different versions of
 * each other.
 */

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="shell pt-[var(--space-xl)]">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-2">
            {crumb.href ? (
              <Link href={crumb.href} className="inline-flex min-h-11 items-center underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-current">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {crumb.label}
              </span>
            )}
            {i < trail.length - 1 && <span aria-hidden="true" className="text-muted">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Sections of a long document: on a wide screen the heading sits in the
 * left margin (four columns) and the text runs beside it at a reading
 * measure; each section opens on a hairline.
 */
export function DocSections({
  sections,
  headingLevel = "h2",
}: {
  sections: { title: string; body: React.ReactNode; key?: string }[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <div className="shell">
      {sections.map((section) => (
        <section
          key={section.key ?? section.title}
          className="grid gap-y-[var(--space-sm)] border-t border-rule py-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]"
        >
          <Heading className="title text-ink lg:col-span-4">{section.title}</Heading>
          <div className="max-w-[65ch] text-[1.0625rem] leading-[1.7] text-ink-2 lg:col-span-7 lg:col-start-6">{section.body}</div>
        </section>
      ))}
    </div>
  );
}

export function ContentCta({ locale }: { locale: Locale }) {
  const c = getDictionary(locale).content;

  return (
    <section className="band mt-[var(--section-gap-s)]">
      <div className="shell grid gap-y-[var(--space-xl)] lg:grid-cols-12 lg:items-end lg:gap-x-[var(--gap-columns)]">
        <div className="lg:col-span-6">
          <h2 className="section-head text-ink">{c.ctaTitle}</h2>
          <p className="mt-[var(--space-md)] max-w-[48ch] text-ink-2">{c.ctaBody}</p>
        </div>
        <div className="lg:col-span-6">
          <AudienceCtas locale={locale} showPricingLink />
        </div>
      </div>
    </section>
  );
}

/** Links to every other event type, so no content page is a dead end. */
export function EventTypeLinks({ locale, exceptSlug }: { locale: Locale; exceptSlug?: string }) {
  const c = getDictionary(locale).content;
  const others = c.eventTypes.filter((t) => t.slug !== exceptSlug);
  if (others.length === 0) return null;

  return (
    <nav aria-label={c.eventTypesLabel} className="shell pt-[var(--space-2xl)]">
      <p className="font-semibold text-ink">{c.eventTypesLabel}</p>
      <ul className="mt-[var(--space-sm)] flex flex-wrap gap-2">
        {others.map((type) => (
          <li key={type.slug}>
            <Link href={`/${locale}/dogadjaji/${type.slug}`} className="btn btn-sm btn-secondary">
              {type.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ContentShell({
  children,
  trail,
  title,
  body,
  locale,
}: {
  children: React.ReactNode;
  trail: Crumb[];
  title: string;
  body: string;
  locale: Locale;
}) {
  return (
    <main>
      <SiteNav />
      <Breadcrumbs trail={trail} />
      <section className="shell grid gap-y-[var(--space-lg)] pb-[var(--space-2xl)] pt-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
        <h1 className="max-w-[18ch] font-display text-[clamp(2.5rem,3.6vw+1rem,4.25rem)] font-semibold leading-[1.05] text-ink lg:col-span-8">
          {title}
        </h1>
        <p className="lead max-w-[60ch] lg:col-span-7">{body}</p>
      </section>
      {children}
      <SiteFooter locale={locale} />
    </main>
  );
}
