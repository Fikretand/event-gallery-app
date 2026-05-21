import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { OneTimePlanCard } from "@/components/pricing-showcase";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { coupleBenefits, couplePlanHighlights } from "@/lib/marketing";

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

export default function ForCouplesPage() {
  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5 sm:space-y-6">
            <p className="inline-flex rounded-full border border-[var(--color-moss)]/20 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              For couples
            </p>
            <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-6xl">
              Gather every wedding memory with one QR code and one private gallery.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/70 sm:text-lg sm:leading-8">
              Confetti gives couples a simple one-event home for guest uploads and private sharing, without
              forcing family and friends into another app.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MarketingButtonLink
                href="/signup?intent=couple"
                className="w-full px-7 py-4 text-base shadow-[0_20px_44px_rgba(226,121,82,0.26)] sm:w-auto"
              >
                Create an event
              </MarketingButtonLink>
            </div>
          </div>

          <div className="mt-2 lg:mt-0">
            <OneTimePlanCard compact />
          </div>
        </div>
      </section>

      <MarketingTrustStrip />

      <section className="shell grid gap-5 py-10 md:grid-cols-3">
        {coupleBenefits.map((item, index) => (
          <Panel key={item.title} className="mesh-card bg-white/80">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,var(--color-accent-soft),#f8e0d3)] text-[var(--color-moss)] shadow-[0_10px_24px_rgba(226,121,82,0.16)]">
              <CoupleBenefitIcon index={index} />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--color-ink)]">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-black/72">{item.body}</p>
          </Panel>
        ))}
      </section>

      <section className="shell py-10">
        <Panel className="mesh-card bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,211,195,0.36))]">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                What couples get in one event
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                One simple setup, one private place, and one less thing to worry about.
              </h2>
            </div>
            <div className="grid gap-3">
              {couplePlanHighlights.map((item) => (
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
          <div className="grid gap-5 md:grid-cols-3">
            {[
              "Create your event and generate a guest upload QR code.",
              "Place the QR on tables, invites, or signage so everyone can send photos instantly.",
              "Open the private gallery later and keep every guest memory together in one private place.",
            ].map((step, index) => (
              <div key={step} className="rounded-[24px] border border-black/8 bg-white/85 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                  Step {index + 1}
                </p>
                <p className="mt-3 text-sm leading-6 text-black/72">{step}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <MarketingTestimonials />
    </main>
  );
}
