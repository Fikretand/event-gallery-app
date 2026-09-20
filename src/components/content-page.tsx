import Link from "next/link";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { getDictionary, type Locale } from "@/lib/i18n/index";

/**
 * Shared chrome for the standalone content pages.
 *
 * They all want the same three things — a trail back up, one `<h1>`, and a
 * closing call to action — and having them in one place is what keeps the
 * pages from drifting into slightly different versions of each other.
 */

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="shell pt-8">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-black/45">
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-2">
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-[var(--color-ink)]">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-black/60">
                {crumb.label}
              </span>
            )}
            {i < trail.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ContentCta({ locale }: { locale: Locale }) {
  const c = getDictionary(locale).content;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <section className="shell py-12">
      <Panel className="mesh-card bg-white/85 text-center">
        <div className="mx-auto max-w-2xl py-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            {c.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/62 sm:text-base sm:leading-7">
            {c.ctaBody}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <MarketingButtonLink href={lp("/get-started")} tone="accent" className="rounded-[18px] px-6 py-3.5">
              {c.ctaPrimary}
            </MarketingButtonLink>
            <MarketingButtonLink href={lp("/pricing")} tone="ink" className="rounded-[18px] px-6 py-3.5">
              {c.ctaSecondary}
            </MarketingButtonLink>
          </div>
        </div>
      </Panel>
    </section>
  );
}

/** Links to every other event type, so no content page is a dead end. */
export function EventTypeLinks({ locale, exceptSlug }: { locale: Locale; exceptSlug?: string }) {
  const c = getDictionary(locale).content;
  const others = c.eventTypes.filter((t) => t.slug !== exceptSlug);
  if (others.length === 0) return null;

  return (
    <section className="shell py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
        {c.eventTypesLabel}
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {others.map((type) => (
          <Link
            key={type.slug}
            href={`/${locale}/dogadjaji/${type.slug}`}
            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-black/20 hover:bg-white"
          >
            {type.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ContentShell({
  children,
  trail,
  title,
  body,
}: {
  children: React.ReactNode;
  trail: Crumb[];
  title: string;
  body: string;
}) {
  return (
    <main className="pb-8">
      <SiteNav />
      <Breadcrumbs trail={trail} />
      <section className="shell py-8 sm:py-10">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-7 text-black/68 sm:text-lg sm:leading-8">{body}</p>
        </div>
      </section>
      {children}
    </main>
  );
}
