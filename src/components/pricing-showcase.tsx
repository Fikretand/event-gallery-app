"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { getDictionary } from "@/lib/i18n/index";
import type { Locale } from "@/lib/i18n/index";
import { photographerPlans as basePlans, couplePlan as baseCouple } from "@/lib/marketing";
import { cn } from "@/lib/utils";

type BillingMode = "monthly" | "yearly";

function extractLocale(pathname: string): Locale {
  return pathname.startsWith("/bs") ? "bs" : "en";
}

export function OneTimePlanCard({ compact = false }: { compact?: boolean }) {
  const locale = extractLocale(usePathname());
  const dict = getDictionary(locale);
  const ui = dict.pricingUi;
  const plan = dict.marketing.couplePlan;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <section
      className={cn(
        "rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,211,195,0.56))] p-7 shadow-[0_24px_80px_rgba(18,24,38,0.08)] backdrop-blur",
        compact ? "max-w-xl" : "",
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">{ui.oneTimePlan}</p>
        <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{plan.name}</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-black/62">{plan.summary}</p>
      </div>

      <div className="mt-6 flex items-end gap-3">
        <span className="text-5xl font-semibold tracking-tight text-[var(--color-ink)]">{baseCouple.price}</span>
        <span className="pb-1 text-sm leading-5 text-black/55">{plan.priceLabel}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--color-moss)]">{ui.oneTimePerfect}</p>

      <MarketingButtonLink
        href={lp("/signup?intent=couple")}
        tone="ink"
        className="mt-6 w-full rounded-[18px] py-4"
      >
        {plan.trialCtaLabel}
      </MarketingButtonLink>

      <div className="mt-7 border-t border-black/8 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{ui.includes}</p>
        <div className="mt-4 space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm leading-6 text-[var(--color-ink)]">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-[var(--color-accent)]">
                {"✓"}
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingShowcase() {
  const [billing, setBilling] = useState<BillingMode>("yearly");
  const locale = extractLocale(usePathname());
  const dict = getDictionary(locale);
  const ui = dict.pricingUi;
  const lp = (path: string) => `/${locale}${path}`;

  // Merge locale text with locale-independent prices/flags from marketing.ts
  const plans = dict.marketing.photographerPlans.map((plan, i) => ({
    ...plan,
    yearlyPrice: basePlans[i].yearlyPrice,
    monthlyPrice: basePlans[i].monthlyPrice,
    featured: basePlans[i].featured ?? false,
  }));

  return (
    <div className="space-y-8">
      <div className="mx-auto flex w-fit items-center rounded-[22px] border border-black/8 bg-white/80 p-1 shadow-[0_18px_40px_rgba(18,24,38,0.08)]">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={cn(
            "rounded-[18px] px-5 py-3 text-sm font-semibold transition",
            billing === "monthly" ? "bg-[var(--color-ink)] text-[#fff]" : "text-black/62 hover:bg-black/4",
          )}
        >
          {ui.monthlyBilling}
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={cn(
            "flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold transition",
            billing === "yearly" ? "bg-[#dff3fb] text-[var(--color-ink)]" : "text-black/62 hover:bg-black/4",
          )}
        >
          {ui.yearlyBilling}
          <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-moss)]">
            {ui.save20}
          </span>
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.06fr_1fr]">
        {plans.map((plan) => {
          const isYearly = billing === "yearly";
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const label = isYearly ? plan.yearlyLabel : plan.monthlyLabel;

          return (
            <section
              key={plan.name}
              className={cn(
                "rounded-[30px] border p-7 shadow-[0_24px_80px_rgba(18,24,38,0.08)] backdrop-blur",
                plan.featured
                  ? "relative border-[#9edffc] bg-white ring-2 ring-[#cfefff]"
                  : "border-black/10 bg-white/82",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{plan.name}</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-black/62">{plan.summary}</p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-[#dff3fb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#156480]">
                    {ui.mostPopular}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-tight text-[var(--color-ink)]">{price}</span>
                <span className="pb-1 text-sm leading-5 text-black/55">{label}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-moss)]">{plan.savingsLabel}</p>

              <MarketingButtonLink
                href={lp(`/signup?intent=photographer&plan=${plan.name.toLowerCase()}`)}
                tone={plan.featured ? "ink" : "accent"}
                className={cn("mt-6 w-full rounded-[18px] py-4", !plan.featured && "shadow-[0_16px_36px_rgba(226,121,82,0.22)]")}
              >
                {plan.ctaLabel}
              </MarketingButtonLink>

              <div className="mt-7 border-t border-black/8 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{ui.includes}</p>
                <div className="mt-4 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm leading-6 text-[var(--color-ink)]">
                      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dff3fb] text-[11px] font-bold text-[#156480]">
                        {"✓"}
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
        <OneTimePlanCard />
      </div>
    </div>
  );
}
