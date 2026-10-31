import type { Metadata } from "next";
import Link from "next/link";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { OneTimePlanCard } from "@/components/pricing-showcase";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CheckIcon } from "@/components/ui/check-icon";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

function CoupleBenefitIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5.5l1.8 3.8 4.2.6-3 2.9.7 4.2-3.7-2-3.7 2 .7-4.2-3-2.9 4.2-.6L12 5.5z" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="7" y="2.8" width="10" height="18.4" rx="2.5" />
          <path d="M10 6.5h4M11 18h2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M7 15l3-3 2.5 2.5L15 12l3 3" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getDictionary(locale as Locale).seo.forCouples;
  return publicMetadata({
    locale: locale as Locale,
    path: "/for-couples",
    title: seo.title,
    description: seo.description,
  });
}

export default async function ForCouplesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.forCouples;
  const dm = dict.marketing;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <main>
      <SiteNav />

      {/* ─── Hero (Counter): the argument on the left, the one plan to buy
           on the right ─── */}
      <section className="shell grid gap-y-[var(--space-2xl)] py-[var(--space-2xl)] lg:min-h-[min(calc(100svh-var(--nav-height)),820px)] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--gap-columns)]">
        <div className="settle lg:col-span-7">
          <h1 className="max-w-[18ch] font-display text-[clamp(2.5rem,4vw+1rem,4.5rem)] font-semibold leading-[1.04] text-ink">
            {d.title}
            <span className="display-s mt-[var(--space-sm)] block italic text-accent">{d.titleAccent}</span>
          </h1>
          <p className="lead mt-[var(--space-lg)] max-w-[52ch]">{d.body}</p>
          <div className="mt-[var(--space-xl)] flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingButtonLink href={lp("/signup?intent=couple")} className="w-full sm:w-auto">
              {d.ctaPrimary}
            </MarketingButtonLink>
            <Link href={lp("/pricing")} className="btn btn-quiet w-full sm:w-auto">
              {d.ctaSecondary}
            </Link>
          </div>
          <p className="meta mt-[var(--space-md)]">{dict.pricingUi.trialNote}</p>
        </div>

        <div className="lg:col-span-5">
          <OneTimePlanCard featureColumns={2} />
        </div>
      </section>

      {/* ─── Three reasons, across, under one hairline ─── */}
      <section className="shell section-s">
        <h2 className="section-head max-w-[20ch] text-ink">{d.benefitsEyebrow}</h2>
        <ul className="mt-[var(--space-2xl)] grid gap-y-[var(--space-xl)] border-t border-rule pt-[var(--space-xl)] sm:grid-cols-3 sm:gap-x-[var(--gap-columns)]">
          {dm.coupleBenefits.map((item, i) => (
            <li key={item.title}>
              <h3 className="title flex items-center gap-3 text-ink">
                <span className="text-moss">
                  <CoupleBenefitIcon index={i} />
                </span>
                {item.title}
              </h3>
              <p className="mt-[var(--space-sm)] max-w-[40ch] leading-relaxed text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── What the plan holds, set as a list beside its heading ─── */}
      <section className="band">
        <div className="shell grid gap-y-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
          <h2 className="section-head max-w-[16ch] text-ink lg:col-span-5">{d.highlightsTitle}</h2>
          <ul className="grid gap-x-[var(--gap-columns)] border-t border-rule-2 sm:grid-cols-2 lg:col-span-7">
            {dm.couplePlanHighlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3 border-b border-rule-2 py-[var(--space-md)] text-ink">
                <CheckIcon />
                <span className="leading-relaxed">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter locale={locale as Locale} />
    </main>
  );
}
