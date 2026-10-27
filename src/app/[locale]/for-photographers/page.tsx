import type { Metadata } from "next";
import Link from "next/link";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { PricingShowcase } from "@/components/pricing-showcase";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CheckIcon } from "@/components/ui/check-icon";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getDictionary(locale as Locale).seo.forPhotographers;
  return publicMetadata({
    locale: locale as Locale,
    path: "/for-photographers",
    title: seo.title,
    description: seo.description,
  });
}

export default async function ForPhotographersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.forPhotographers;
  const dm = dict.marketing;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <main>
      <SiteNav />

      {/* ─── Hero (Stage): the offer on six columns, a client's wedding on
           the other six ─── */}
      <section className="shell grid gap-y-[var(--space-2xl)] py-[var(--space-2xl)] lg:min-h-[min(calc(100svh-var(--nav-height)),820px)] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--gap-columns)]">
        <div className="settle lg:col-span-6">
          <h1 className="max-w-[18ch] font-display text-[clamp(2.5rem,3.6vw+1rem,4.25rem)] font-semibold leading-[1.05] text-ink">
            {d.title}
          </h1>
          <p className="lead mt-[var(--space-lg)] max-w-[52ch]">{d.body}</p>
          <div className="mt-[var(--space-xl)] flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingButtonLink href={lp("/signup?intent=photographer")} className="w-full sm:w-auto">
              {d.ctaPrimary}
            </MarketingButtonLink>
            <Link href="#pricing" className="btn btn-quiet w-full sm:w-auto">
              {d.ctaSecondary}
            </Link>
          </div>
        </div>
        <div className="lg:col-span-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/explainer/assets/gallery-ceremony-1.webp"
            alt=""
            width={800}
            height={533}
            fetchPriority="high"
            className="aspect-[4/3] h-auto w-full rounded-[var(--radius-image)] bg-paper-3 object-cover"
          />
        </div>
      </section>

      {/* ─── Three reasons, across ─── */}
      <section className="shell section-s">
        <h2 className="section-head max-w-[20ch] text-ink">{d.benefitsEyebrow}</h2>
        <ul className="mt-[var(--space-2xl)] grid gap-y-[var(--space-xl)] border-t border-rule pt-[var(--space-xl)] sm:grid-cols-3 sm:gap-x-[var(--gap-columns)]">
          {dm.photographerBenefits.map((item) => (
            <li key={item.title}>
              <h3 className="title text-ink">{item.title}</h3>
              <p className="mt-[var(--space-sm)] max-w-[40ch] leading-relaxed text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── The working day, as four numbered steps on the ink band ─── */}
      <section className="bg-ink py-[var(--section-gap-s)] text-paper">
        <div className="shell">
          <h2 className="section-head max-w-[22ch] text-paper">{d.workflowTitle}</h2>
          <p className="mt-[var(--space-lg)] max-w-[60ch] text-[1.0625rem] leading-relaxed text-paper-3">{d.workflowBody}</p>
          <ol className="mt-[var(--space-2xl)] grid gap-y-[var(--space-xl)] sm:grid-cols-2 sm:gap-x-[var(--gap-columns)] lg:grid-cols-4">
            {d.workflow.map((step, i) => (
              <li key={step.title} className="border-t border-ink-2 pt-[var(--space-lg)]">
                <h3 className="flex items-baseline gap-3 text-lg font-semibold leading-snug text-paper">
                  <span className="num font-display text-[length:var(--text-2xl)] font-semibold text-paper-3">{i + 1}</span>
                  {step.title}
                </h3>
                <p className="mt-[var(--space-xs)] leading-relaxed text-paper-3">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Why photographers switch: the heading beside the reasons ─── */}
      <section className="shell section">
        <div className="grid gap-y-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
          <h2 className="section-head max-w-[18ch] text-ink lg:col-span-5">{d.switchTitle}</h2>
          <ul className="border-t border-rule lg:col-span-7">
            {dm.photographerSwitchReasons.map((reason) => (
              <li key={reason} className="flex items-start gap-3 border-b border-rule py-[var(--space-md)] text-ink">
                <CheckIcon />
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="shell section-s">
        <PricingShowcase />
      </section>

      <SiteFooter locale={locale as Locale} />
    </main>
  );
}
