import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { localePrefix, type Locale } from "@/lib/i18n/index";
import type { LegalDoc } from "@/lib/legal";

export function LegalDocView({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  const prefix = localePrefix(locale);
  const siblingHref = `${prefix}/${doc.kind === "privacy" ? "terms" : "privacy"}`;

  return (
    <main>
      <SiteNav />
      <section className="shell py-10 sm:py-14">
        <Panel className="mx-auto max-w-3xl bg-white/94 p-6 sm:p-9">
          {/* Draft notice — delete `draftNotice` from the doc once finalized. */}
          {doc.draftNotice ? (
            <div className="mb-6 rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-4 py-3 text-sm leading-6 text-[var(--color-ink)]">
              {doc.draftNotice}
            </div>
          ) : null}

          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
            {doc.updated}
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {doc.title}
          </h1>

          <div className="mt-5 space-y-3">
            {doc.intro.map((p, i) => (
              <p key={i} className="text-sm leading-7 text-black/68 sm:text-base">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-8 space-y-8">
            {doc.sections.map((section, i) => (
              <div key={i}>
                <h2 className="font-display text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
                  {section.heading}
                </h2>
                {section.paragraphs?.map((p, j) => (
                  <p key={j} className="mt-3 text-sm leading-7 text-black/68">
                    {p}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((b, j) => (
                      <li key={j} className="flex gap-3 text-sm leading-7 text-black/68">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-black/8 pt-6">
            <Link
              href={siblingHref}
              className="text-sm font-semibold text-[var(--color-moss)] underline-offset-4 hover:underline"
            >
              {doc.otherLabel} →
            </Link>
          </div>
        </Panel>
      </section>
    </main>
  );
}
