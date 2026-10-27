import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { PricingShowcase } from "@/components/pricing-showcase";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getDictionary(locale as Locale).seo.pricing;
  return publicMetadata({
    locale: locale as Locale,
    path: "/pricing",
    title: seo.title,
    description: seo.description,
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.pricing;

  return (
    <main>
      <SiteNav />

      {/* ─── Banner: the heading and its line, the table right under ─── */}
      <section className="shell grid gap-y-[var(--space-lg)] py-[var(--space-2xl)] lg:grid-cols-12 lg:items-end lg:gap-x-[var(--gap-columns)]">
        <h1 className="max-w-[16ch] font-display text-[clamp(2.5rem,4vw+1rem,4.5rem)] font-semibold leading-[1.04] text-ink lg:col-span-7">
          {d.title}
        </h1>
        <p className="lead max-w-[48ch] lg:col-span-5">{d.body}</p>
      </section>

      <section className="shell pb-[var(--section-gap-s)]">
        <PricingShowcase />
      </section>

      {/* ─── What every plan shares, as three across on a well ─── */}
      <section className="band">
        <ul className="shell grid gap-y-[var(--space-xl)] sm:grid-cols-3 sm:gap-x-[var(--gap-columns)]">
          {d.features.map((item) => (
            <li key={item.title}>
              <h2 className="title text-ink">{item.title}</h2>
              <p className="mt-[var(--space-sm)] max-w-[40ch] leading-relaxed text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter locale={locale as Locale} />
    </main>
  );
}
