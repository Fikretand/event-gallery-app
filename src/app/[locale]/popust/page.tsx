import type { Metadata } from "next";
import Link from "next/link";

import { LeadForm } from "@/components/lead/lead-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CheckIcon } from "@/components/ui/check-icon";
import { getDictionary, t, type Locale } from "@/lib/i18n/index";
import { getLeadSettings } from "@/lib/leads";
import { OFFER_FULL_PRICE_BAM, OFFER_PRICE_BAM } from "@/lib/lead-sequence";
import { formatBam } from "@/lib/pricing";
import { publicMetadata } from "@/lib/seo";

// The schedule and the on/off switch live in the database; read them per visit.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const s = getDictionary(locale as Locale).leadOffer;
  return publicMetadata({ locale: locale as Locale, path: "/popust", title: s.seoTitle, description: s.seoDescription });
}

/**
 * Where the Instagram and TikTok ads land: one offer, one field. The ad's
 * utm_* parameters ride along in the form, so /admin/leads can tell which
 * campaign brought whom.
 */
export default async function LeadOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const dict = getDictionary(locale as Locale);
  const s = dict.leadOffer;
  const settings = await getLeadSettings();
  const price = formatBam(OFFER_PRICE_BAM.offer);
  const full = formatBam(OFFER_FULL_PRICE_BAM);
  const off = formatBam(OFFER_FULL_PRICE_BAM - OFFER_PRICE_BAM.offer);
  const utm = (key: string) => {
    const value = query[key];
    return (Array.isArray(value) ? value[0] : value)?.slice(0, 100) ?? "";
  };

  return (
    <main>
      <SiteNav />
      <section className="shell grid gap-y-[var(--space-2xl)] py-[var(--space-2xl)] lg:min-h-[min(calc(100svh-var(--nav-height)),760px)] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--gap-columns)]">
        <div className="settle lg:col-span-7">
          {settings.is_active ? (
            <>
              <h1 className="max-w-[16ch] font-display text-[clamp(2.4rem,3.6vw+1rem,4.25rem)] font-semibold leading-[1.05] text-ink">
                {t(s.title, { off })}
              </h1>
              <p className="lead mt-[var(--space-lg)] max-w-[50ch]">{t(s.lead, { price, full, days: settings.valid_days })}</p>
              <ul className="mt-[var(--space-lg)] space-y-2">
                {s.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-ink-2">
                    <CheckIcon />
                    {point}
                  </li>
                ))}
              </ul>
              <LeadForm
                locale={locale as Locale}
                strings={s}
                utm={{ utm_source: utm("utm_source"), utm_medium: utm("utm_medium"), utm_campaign: utm("utm_campaign") }}
                privacyHref={`/${locale}/privacy`}
              />
            </>
          ) : (
            <>
              <h1 className="max-w-[18ch] font-display text-[clamp(2.2rem,3vw+1rem,3.75rem)] font-semibold leading-[1.05] text-ink">{s.closedTitle}</h1>
              <p className="lead mt-[var(--space-lg)] max-w-[50ch]">{s.closedBody}</p>
              <Link href={`/${locale}/pricing`} className="btn btn-primary mt-[var(--space-xl)]">
                {s.closedCta}
              </Link>
            </>
          )}
        </div>
        <div className="lg:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/guests-filming-720.webp"
            srcSet="/landing/guests-filming-480.webp 480w, /landing/guests-filming-720.webp 720w, /landing/guests-filming-1200.webp 1200w"
            sizes="(min-width: 1024px) 40vw, calc(100vw - 32px)"
            alt={s.photoAlt}
            width={720}
            height={900}
            className="aspect-[4/5] h-auto w-full rounded-[var(--radius-image)] bg-paper-3 object-cover"
          />
        </div>
      </section>
      <SiteFooter locale={locale as Locale} />
    </main>
  );
}
