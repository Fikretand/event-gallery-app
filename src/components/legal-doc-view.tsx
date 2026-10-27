import Link from "next/link";

import { Breadcrumbs } from "@/components/content-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { localePrefix, type Locale } from "@/lib/i18n/index";
import type { LegalDoc } from "@/lib/legal";

/**
 * A legal document as a long document: the title and the date it was last
 * changed, the draft notice while there is one, then each section with its
 * heading in the margin and the text at a reading measure. The words come
 * from `legal.ts` untouched.
 */
export function LegalDocView({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  const prefix = localePrefix(locale);
  const siblingHref = `${prefix}/${doc.kind === "privacy" ? "terms" : "privacy"}`;

  return (
    <main>
      <SiteNav />
      <Breadcrumbs trail={[{ label: "Confetti", href: prefix || "/" }, { label: doc.title }]} />

      <header className="shell grid gap-y-[var(--space-md)] pb-[var(--space-2xl)] pt-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
        <div className="lg:col-span-8">
          <h1 className="font-display text-[clamp(2.25rem,3vw+1rem,3.75rem)] font-semibold leading-[1.08] text-ink">{doc.title}</h1>
          <p className="meta mt-[var(--space-sm)]">{doc.updated}</p>
        </div>
        {/* Draft notice — delete `draftNotice` from the doc once finalized. */}
        {doc.draftNotice ? (
          <p role="note" className="notice notice-warning max-w-[80ch] lg:col-span-8">
            {doc.draftNotice}
          </p>
        ) : null}
        <div className="max-w-[65ch] space-y-3 text-[1.0625rem] leading-[1.7] text-ink-2 lg:col-span-7">
          {doc.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </header>

      <div className="shell">
        {doc.sections.map((section, i) => (
          <section
            key={i}
            className="grid gap-y-[var(--space-sm)] border-t border-rule py-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]"
          >
            <h2 className="title text-ink lg:col-span-4">{section.heading}</h2>
            <div className="max-w-[65ch] space-y-3 text-[1.0625rem] leading-[1.7] text-ink-2 lg:col-span-7 lg:col-start-6">
              {section.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5 marker:text-muted">
                  {section.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
        <p className="border-t border-rule py-[var(--space-xl)]">
          <Link href={siblingHref} className="link">
            {doc.otherLabel}
          </Link>
        </p>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
