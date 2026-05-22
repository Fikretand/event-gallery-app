import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { PricingShowcase } from "@/components/pricing-showcase";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { getDictionary, type Locale } from "@/lib/i18n/index";

const WORKFLOW_ICONS = ["spark", "qr", "shield", "frame"] as const;

function WorkflowIcon({ type }: { type: typeof WORKFLOW_ICONS[number] }) {
  switch (type) {
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M13 2L4.5 13.5h7L9.5 22 20.5 10h-7L13 2Z" />
        </svg>
      );
    case "qr":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h2v2h-2zM18 14h2v6h-2M14 18h4" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 2.5l7 3v4.5c0 4.5-3.2 8-7 9.5C8.2 18 5 14.5 5 10V5.5L12 2.5Z" />
          <path d="M9 12.2l2 2 4-4.5" />
        </svg>
      );
    case "frame":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
  }
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
    <main className="pb-16">
      <SiteNav />

      {/* Hero */}
      <section className="shell py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-moss)]">
            {d.eyebrow}
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.04] tracking-tight text-[var(--color-ink)] sm:text-6xl">
            {d.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
            {d.body}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <MarketingButtonLink
              href={lp("/signup?intent=photographer")}
              className="w-full px-8 shadow-[0_12px_32px_rgba(226,121,82,0.28)] sm:w-auto"
            >
              {d.ctaPrimary}
            </MarketingButtonLink>
            <MarketingButtonLink href={lp("/pricing")} tone="ghost" className="w-full bg-white/70 px-8 sm:w-auto">
              {d.ctaSecondary}
            </MarketingButtonLink>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {dm.photographerBenefits.map((item) => (
            <Panel
              key={item.title}
              className="mesh-card border-[#dde7e1] bg-[linear-gradient(160deg,rgba(245,251,248,0.98),rgba(224,238,232,0.72))]"
            >
              <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-black/65">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="shell py-12 sm:py-16">
        <div className="rounded-[36px] border border-[#22334c]/65 bg-[radial-gradient(ellipse_at_top_left,rgba(226,121,82,0.12),transparent_38%),linear-gradient(160deg,#1e2d45,#172033)] px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.26em] text-[#a8c4b8]">
            {d.workflowEyebrow}
          </p>
          <h2 className="font-display mt-4 text-center text-3xl font-semibold text-white sm:text-4xl">
            {d.workflowTitle}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.workflow.map((step, i) => (
              <div key={step.title} className="rounded-[24px] border border-white/10 bg-white/7 p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/10 text-white/80">
                  <WorkflowIcon type={WORKFLOW_ICONS[i]} />
                </div>
                <p className="mt-4 text-sm font-semibold text-white/90">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/52">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Switch reasons */}
      <section className="shell pb-12 sm:pb-16">
        <Panel className="mesh-card border-[#d9cfc1] bg-[linear-gradient(160deg,#fffdfb,rgba(242,234,223,0.85))]">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            {d.switchTitle}
          </h2>
          <ul className="mt-6 space-y-3">
            {dm.photographerSwitchReasons.map((reason) => (
              <li key={reason} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-moss)]/12 text-[10px] text-[var(--color-moss)]">✓</span>
                <span className="text-sm leading-6 text-black/72">{reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <MarketingTrustStrip />
      <MarketingTestimonials />

      <section className="shell py-6">
        <PricingShowcase />
      </section>
    </main>
  );
}
