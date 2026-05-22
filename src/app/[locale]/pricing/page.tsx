import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { PricingShowcase } from "@/components/pricing-showcase";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.pricing;

  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell py-10 sm:py-12">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <p className="text-sm text-black/48">{d.eyebrow}</p>
          <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-tight text-[var(--color-ink)] sm:text-6xl">
            {d.title}
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-7 text-black/68 sm:text-lg sm:leading-8">
            {d.body}
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
            {d.features.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-black/8 bg-white/75 p-5">
                <p className="text-base font-semibold text-[var(--color-ink)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-black/65">{item.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
