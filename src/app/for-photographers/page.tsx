import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { PricingShowcase } from "@/components/pricing-showcase";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { photographerBenefits, photographerSwitchReasons } from "@/lib/marketing";

const workflow = [
  {
    icon: "spark",
    title: "Set the event once",
    body: "Create the gallery, choose privacy settings, and generate guest and client links from one calm dashboard.",
  },
  {
    icon: "qr",
    title: "Collect guest moments live",
    body: "Share the QR at the venue so guests can upload from their phones without accounts or app installs.",
  },
  {
    icon: "shield",
    title: "Moderate before delivery",
    body: "Keep guest uploads hidden by default, then unhide, delete, or restore as you curate the gallery.",
  },
  {
    icon: "frame",
    title: "Deliver a polished gallery",
    body: "Upload your final images, keep downloads private, and hand off one gallery that feels premium to the client.",
  },
];

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

export default function ForPhotographersPage() {
  return (
    <main className="pb-16">
      <SiteNav />

      <section className="shell py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5 sm:space-y-6">
            <p className="inline-flex rounded-full border border-[var(--color-moss)]/20 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              For photographers
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-6xl">
              Replace scattered delivery tools with one private event workflow.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-black/70 sm:text-lg sm:leading-8">
              Confetti is built for wedding and event photographers who want QR guest uploads, private client delivery,
              calmer moderation, and one product that feels intentional from setup to handoff.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MarketingButtonLink href="/signup?intent=photographer" className="w-full px-6 sm:w-auto">
                Start free
              </MarketingButtonLink>
              <MarketingButtonLink href="#pricing" tone="ghost" className="w-full bg-white/75 px-6 sm:w-auto">
                Compare pricing
              </MarketingButtonLink>
            </div>
          </div>

          <Panel className="mesh-card bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,211,195,0.5))]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">What this replaces</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Guest photos scattered across WhatsApp groups and AirDrop drops",
                "Drive folders that feel generic and unbranded",
                "Separate tools for guest collection and final gallery delivery",
                "Manual client download requests after every event",
                "Last-minute QR sharing across PDFs, messages, and venue notes",
                "Too much manual review before showing guest moments to the client",
              ].map((item) => (
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

      <MarketingTrustStrip />

      <section className="shell grid gap-5 py-10 md:grid-cols-3">
        {photographerBenefits.map((item) => (
          <Panel key={item.title} className="mesh-card bg-white/80">
            <p className="text-lg font-semibold text-[var(--color-ink)]">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-black/72">{item.body}</p>
          </Panel>
        ))}
      </section>

      <section className="shell py-10">
        <Panel className="mesh-card bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,211,195,0.36))]">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                Why photographers switch
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                Better delivery is easier to sell than another storage tool.
              </h2>
            </div>
            <div className="grid gap-3">
              {photographerSwitchReasons.map((item) => (
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">Workflow</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                A better event-day system from capture to delivery
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/68">
                Confetti is not another folder. It is a controlled event workflow designed around how photographers
                actually manage uploads, reviews, and client handoff.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {workflow.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[24px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,243,236,0.9))] p-5 shadow-[0_14px_34px_rgba(18,24,38,0.05)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,var(--color-accent-soft),#f8e0d3)] text-[var(--color-moss)] shadow-[0_10px_24px_rgba(226,121,82,0.16)]">
                      <WorkflowIcon kind={step.icon} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                      Step {index + 1}
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">Pricing</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Choose the plan that matches your active event load.
          </h2>
          <p className="mx-auto max-w-3xl text-sm leading-6 text-black/68">
            Solo is built for photographers who want a cleaner delivery system. Pro is for regular wedding work with
            more active events, more storage, and a more premium client handoff.
          </p>
        </div>
      </section>

      <section className="shell py-10">
        <PricingShowcase />
      </section>

      <MarketingTestimonials />
    </main>
  );
}
