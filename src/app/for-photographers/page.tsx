import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { PricingShowcase } from "@/components/pricing-showcase";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { getDictionary, type Locale } from "@/lib/i18n/index";

const WORKFLOW_ICONS = ["spark", "qr", "shield", "frame"] as const;

function WorkflowIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "qr":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <path d="M14 14h2v2h-2zM18 14h2v6h-2M14 18h4" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6l7-3z" />
          <path d="M9.5 12.2l1.8 1.8 3.7-4" />
        </svg>
      );
    case "frame":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M7 15l3-3 2.5 2.5L15 12l3 3" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3l1.7 5.2H19l-4.3 3.1 1.6 5.2L12 13.4 7.7 16.5l1.6-5.2L5 8.2h5.3L12 3z" />
        </svg>
      );
  }
}

export default async function ForPhotographersPage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const resolved = await params;
  const locale = (resolved?.locale as Locale) ?? "en";
  const dict = getDictionary(locale);
  const d = dict.forPhotographers;
  const dm = dict.marketing;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <main className="pb-16">
      <SiteNav />

      <section className="shell py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5 sm:space-y-6">
            <p className="inline-flex rounded-full border border-[var(--color-moss)]/20 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              {d.eyebrow}
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-6xl">
              {d.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-black/70 sm:text-lg sm:leading-8">
              {d.body}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MarketingButtonLink href={lp("/signup?intent=photographer")} className="w-full px-6 sm:w-auto">
                {d.ctaPrimary}
              </MarketingButtonLink>
              <MarketingButtonLink href="#pricing" tone="ghost" className="w-full bg-white/75 px-6 sm:w-auto">
                {d.ctaSecondary}
              </MarketingButtonLink>
            </div>
          </div>

          <Panel className="mesh-card bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,211,195,0.5))]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              {d.replacesEyebrow}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {d.replaces.map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,240,0.88))] px-4 py-4 text-sm leading-6 text-[var(--color-ink)] shadow-[0_10px_30px_rgba(18,24,38,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <MarketingTrustStrip locale={locale} />

      <section className="shell py-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
          {d.benefitsEyebrow}
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {dm.photographerBenefits.map((item) => (
            <Panel key={item.title} className="mesh-card bg-white/80">
              <p className="text-lg font-semibold text-[var(--color-ink)]">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-black/72">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="shell py-10">
        <Panel className="mesh-card bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,211,195,0.36))]">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                {d.switchSubtitle}
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                {d.switchTitle}
              </h2>
            </div>
            <div className="grid gap-3">
              {dm.photographerSwitchReasons.map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/8 bg-white/84 px-4 py-4 text-sm leading-6 text-[var(--color-ink)] shadow-[0_10px_30px_rgba(18,24,38,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="shell py-10">
        <Panel className="mesh-card bg-white/85">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                {d.workflowEyebrow}
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                {d.workflowTitle}
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/68">{d.workflowBody}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {d.workflow.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[24px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,243,236,0.9))] p-5 shadow-[0_14px_34px_rgba(18,24,38,0.05)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,var(--color-accent-soft),#f8e0d3)] text-[var(--color-moss)] shadow-[0_10px_24px_rgba(226,121,82,0.16)]">
                      <WorkflowIcon kind={WORKFLOW_ICONS[index] ?? "spark"} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                      {`0${index + 1}`}
                    </p>
                  </div>
                  <p className="mt-3 text-base font-semibold text-[var(--color-ink)]">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-black/72">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section id="pricing" className="shell py-10 scroll-mt-24">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
            {d.pricingEyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {d.pricingTitle}
          </h2>
          <p className="mx-auto max-w-3xl text-sm leading-6 text-black/68">{d.pricingBody}</p>
        </div>
      </section>

      <section className="shell py-10">
        <PricingShowcase />
      </section>

      <MarketingTestimonials />
    </main>
  );
}
