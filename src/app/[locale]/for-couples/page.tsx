import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { OneTimePlanCard } from "@/components/pricing-showcase";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { getDictionary, type Locale } from "@/lib/i18n/index";

function CoupleBenefitIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5.5l1.8 3.8 4.2.6-3 2.9.7 4.2-3.7-2-3.7 2 .7-4.2-3-2.9 4.2-.6L12 5.5z" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="7" y="2.8" width="10" height="18.4" rx="2.5" />
          <path d="M10 6.5h4M11 18h2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M7 15l3-3 2.5 2.5L15 12l3 3" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
  }
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
    <main className="pb-16">
      <SiteNav />

      <section className="shell py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-moss)]">
              {d.eyebrow}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-tight text-[var(--color-ink)] sm:text-6xl">
              {d.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
              {d.body}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <MarketingButtonLink
                href={lp("/signup?intent=couple")}
                className="w-full px-8 shadow-[0_12px_32px_rgba(226,121,82,0.28)] sm:w-auto"
              >
                {d.ctaPrimary}
              </MarketingButtonLink>
              <MarketingButtonLink href={lp("/pricing")} tone="ghost" className="w-full bg-white/70 px-8 sm:w-auto">
                {d.ctaSecondary}
              </MarketingButtonLink>
            </div>
          </div>

          <div>
            <OneTimePlanCard />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {dm.coupleBenefits.map((item, i) => (
            <Panel
              key={item.title}
              className="mesh-card border-[#e8d2c4] bg-[linear-gradient(160deg,rgba(255,253,250,0.98),rgba(248,230,218,0.55))]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/80 text-[var(--color-moss)] shadow-[0_8px_20px_rgba(18,24,38,0.07)]">
                <CoupleBenefitIcon index={i} />
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-black/65">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* Plan highlights */}
      <section className="shell pb-12">
        <Panel className="mesh-card border-[#d9cfc1] bg-[linear-gradient(160deg,#fffdfb,rgba(242,234,223,0.85))]">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            {locale === "bs" ? "Šta dobijate u planu" : "What you get in the plan"}
          </h2>
          <ul className="mt-6 space-y-3">
            {dm.couplePlanHighlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/12 text-[10px] text-[var(--color-accent)]">✓</span>
                <span className="text-sm leading-6 text-black/72">{highlight}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <MarketingTrustStrip locale={locale as Locale} />
      <MarketingTestimonials />
    </main>
  );
}
