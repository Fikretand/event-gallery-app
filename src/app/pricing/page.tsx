import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { PricingShowcase } from "@/components/pricing-showcase";

export default function PricingPage() {
  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell py-10 sm:py-12">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <p className="text-sm text-black/48">Trusted by photographers who need private delivery and guest uploads in one place.</p>
          <h1 className="text-4xl font-semibold leading-[1.04] tracking-tight text-[var(--color-ink)] sm:text-6xl">
            Private galleries that save more stress than they cost.
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-7 text-black/68 sm:text-lg sm:leading-8">
            Pick a recurring plan for your photography business or a one-time wedding plan for a single event.
            Confetti keeps links stable, galleries private, and downloads simple.
          </p>
        </div>
      </section>

      <section className="shell py-6">
        <PricingShowcase />
      </section>

      <MarketingTrustStrip />

      <MarketingTestimonials />

      <section className="shell py-10">
        <Panel className="mesh-card bg-white/82">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Stable links for printed QR cards",
                body: "Event links do not change when you rename the event later, so printed signage and shared cards stay valid.",
              },
              {
                title: "Private delivery by default",
                body: "PIN-protected galleries, hidden guest uploads, and moderation controls keep client delivery calm and controlled.",
              },
              {
                title: "Storage matched to active work",
                body: "Plans are designed around active events and live gallery delivery, not vague unlimited promises that break margins later.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-black/8 bg-white/75 p-5">
                <p className="text-base font-semibold text-[var(--color-ink)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-black/70">{item.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
