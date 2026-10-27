"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { CheckIcon } from "@/components/ui/check-icon";
import { getDictionary, t } from "@/lib/i18n/index";
import type { Locale } from "@/lib/i18n/index";
import { photographerPlans as basePlans, couplePlan as baseCouple } from "@/lib/marketing";
import { cn } from "@/lib/utils";

type BillingMode = "monthly" | "yearly";

/**
 * "39 KM" / "€19" as one unit: the number large, the currency smaller, never
 * split across lines, and the billing period on its own line underneath.
 */
function PriceTag({ value, label }: { value: string; label: string }) {
  const m = /^(\D*?)\s*([\d.,]+)\s*(\D*)$/.exec(value.trim());
  const [prefix, amount, suffix] = m ? [m[1], m[2], m[3]] : ["", value, ""];
  return (
    <div>
      <p className="flex items-baseline gap-1.5 whitespace-nowrap text-ink">
        {prefix ? <span className="text-xl font-semibold">{prefix}</span> : null}
        <span className="num font-display text-[length:var(--text-display-s)] font-semibold leading-none">{amount}</span>
        {suffix ? <span className="text-xl font-semibold">{suffix}</span> : null}
      </p>
      <p className="meta mt-2">{label}</p>
    </div>
  );
}

function extractLocale(pathname: string): Locale {
  return pathname.startsWith("/bs") ? "bs" : "en";
}

type PlanColumn = {
  key: string;
  name: string;
  summary: string;
  tag?: string;
  price: string;
  priceLabel: string;
  note: string;
  href: string;
  cta: string;
  primary: boolean;
  includesLabel: string;
  features: string[];
};

/**
 * One plan as a column of the price table. The four rows (name, price,
 * action, what is included) line up across columns through a subgrid, so
 * every button sits on the same line whatever the summaries' lengths.
 */
function Column({ plan, featureColumns = 1 }: { plan: PlanColumn; featureColumns?: 1 | 2 }) {
  return (
    <article className="grid gap-y-6 border-t border-rule pt-8 lg:row-span-4 lg:grid-rows-subgrid lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 lg:first:border-l-0 lg:first:pl-0">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="title text-ink">{plan.name}</h3>
          {plan.tag ? <span className="chip chip-accent">{plan.tag}</span> : null}
        </div>
        <p className="mt-3 max-w-[34ch] text-ink-2">{plan.summary}</p>
      </div>
      <div>
        <PriceTag value={plan.price} label={plan.priceLabel} />
        <p className="mt-2 text-sm text-moss">{plan.note}</p>
      </div>
      <div className="self-start">
        <MarketingButtonLink href={plan.href} tone={plan.primary ? "accent" : "ghost"} className="w-full">
          {plan.cta}
        </MarketingButtonLink>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{plan.includesLabel}</p>
        <ul className={cn("mt-3 space-y-2.5", featureColumns === 2 && "sm:grid sm:grid-cols-2 sm:gap-x-6 sm:space-y-0 sm:gap-y-2.5")}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-[0.9375rem] leading-6 text-ink-2">
              <CheckIcon />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function oneEventColumn(locale: Locale): PlanColumn {
  const dict = getDictionary(locale);
  const ui = dict.pricingUi;
  const plan = dict.marketing.couplePlan;
  return {
    key: "one-event",
    name: plan.name,
    summary: plan.summary,
    price: baseCouple.price,
    priceLabel: plan.priceLabel,
    note: ui.oneTimePerfect,
    href: `/${locale}/signup?intent=couple`,
    cta: plan.trialCtaLabel,
    primary: false,
    includesLabel: ui.includes,
    features: plan.features,
  };
}

/** The One Event plan on its own, for the couples page. */
export function OneTimePlanCard({ compact = false, featureColumns = 1 }: { compact?: boolean; featureColumns?: 1 | 2 }) {
  const locale = extractLocale(usePathname());
  const column = oneEventColumn(locale);
  return (
    <div className={cn("card p-8", compact ? "max-w-xl" : "")}>
      <div className="grid gap-y-6 [&>article]:border-0 [&>article]:p-0">
        <Column plan={{ ...column, primary: true }} featureColumns={featureColumns} />
      </div>
    </div>
  );
}

export function PricingShowcase() {
  const [billing, setBilling] = useState<BillingMode>("yearly");
  const locale = extractLocale(usePathname());
  const dict = getDictionary(locale);
  const ui = dict.pricingUi;
  const lp = (path: string) => `/${locale}${path}`;
  const oneEvent = oneEventColumn(locale);

  // Merge locale text with locale-independent prices/flags from marketing.ts
  const plans = dict.marketing.photographerPlans.map((plan, i) => ({
    ...plan,
    yearlyPrice: basePlans[i].yearlyPrice,
    monthlyPrice: basePlans[i].monthlyPrice,
    yearlyTotal: basePlans[i].yearlyTotal,
    savingPercent: basePlans[i].savingPercent,
    featured: basePlans[i].featured ?? false,
  }));
  const maxSaving = Math.max(...basePlans.map((p) => p.savingPercent));
  const isYearly = billing === "yearly";

  const columns: PlanColumn[] = [
    ...plans.map((plan) => ({
      key: plan.name,
      name: plan.name,
      summary: plan.summary,
      tag: plan.featured ? ui.mostPopular : undefined,
      price: isYearly ? plan.yearlyPrice : plan.monthlyPrice,
      priceLabel: isYearly ? plan.yearlyLabel : plan.monthlyLabel,
      note: isYearly
        ? t(plan.yearlyTotalNote, { total: plan.yearlyTotal })
        : t(plan.savingsLabel, { percent: String(plan.savingPercent) }),
      href: lp(`/signup?intent=photographer&plan=${plan.name.toLowerCase()}`),
      cta: plan.ctaLabel,
      primary: plan.featured,
      includesLabel: ui.includes,
      features: plan.features,
    })),
    oneEvent,
  ];

  const segment =
    "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] px-4 text-[0.9375rem] sm:px-5 font-semibold transition-colors duration-[var(--dur-micro)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div role="group" aria-label={`${ui.monthlyBilling} / ${ui.yearlyBilling}`} className="inline-flex rounded-[var(--radius-pill)] bg-paper-2 p-1">
        <button
          type="button"
          aria-pressed={!isYearly}
          onClick={() => setBilling("monthly")}
          className={cn(segment, !isYearly ? "bg-card text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:text-ink")}
        >
          {ui.monthlyBilling}
        </button>
        <button
          type="button"
          aria-pressed={isYearly}
          onClick={() => setBilling("yearly")}
          className={cn(segment, isYearly ? "bg-card text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:text-ink")}
        >
          {ui.yearlyBilling}
        </button>
      </div>
      <p className="text-sm font-medium text-moss">{t(ui.save20, { percent: String(maxSaving) })}</p>
      </div>

      <div className="grid gap-y-10 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-8 lg:gap-y-6">
        {columns.map((plan) => (
          <Column key={plan.key} plan={plan} />
        ))}
      </div>
    </div>
  );
}
