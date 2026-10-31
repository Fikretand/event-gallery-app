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
 * Each plan is its own surface, so no two read as one block:
 * - light: the white card (Solo);
 * - dark: the featured plan on ink (Pro);
 * - tint: the one-time plan on paper, a different kind of purchase.
 */
type Tone = "light" | "dark" | "tint";

const surface: Record<Tone, string> = {
  light: "card",
  dark: "rounded-[var(--radius-card)] bg-ink text-paper shadow-[var(--shadow-overlay)]",
  tint: "rounded-[var(--radius-card)] bg-paper-2 ring-1 ring-rule-2",
};

const ink: Record<Tone, { strong: string; soft: string; note: string; check: string }> = {
  light: { strong: "text-ink", soft: "text-ink-2", note: "text-moss", check: "text-moss" },
  tint: { strong: "text-ink", soft: "text-ink-2", note: "text-moss", check: "text-moss" },
  dark: { strong: "text-paper", soft: "text-paper-3", note: "text-paper-3", check: "text-paper" },
};

/**
 * "39 KM" / "€19" as one unit: the number large, the currency smaller, never
 * split across lines, and the billing period on its own line underneath.
 */
function PriceTag({ value, label, tone }: { value: string; label: string; tone: Tone }) {
  const m = /^(\D*?)\s*([\d.,]+)\s*(\D*)$/.exec(value.trim());
  const [prefix, amount, suffix] = m ? [m[1], m[2], m[3]] : ["", value, ""];
  return (
    <div>
      <p className={cn("flex items-baseline gap-1.5 whitespace-nowrap", ink[tone].strong)}>
        {prefix ? <span className="text-xl font-semibold">{prefix}</span> : null}
        <span className="num font-display text-[length:var(--text-display-s)] font-semibold leading-none">{amount}</span>
        {suffix ? <span className="text-xl font-semibold">{suffix}</span> : null}
      </p>
      <p className={cn("mt-2 text-sm", ink[tone].soft)}>{label}</p>
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
  buttonTone: "accent" | "ink" | "ghost";
  includesLabel: string;
  features: string[];
};

/**
 * One plan as a card. Its four rows (name, price, action, what is included)
 * line up with the other cards through a subgrid on wide screens, so every
 * button sits on the same line whatever the summaries' lengths.
 */
function Column({
  plan,
  tone,
  featureColumns = 1,
  className,
}: {
  plan: PlanColumn;
  tone: Tone;
  featureColumns?: 1 | 2;
  className?: string;
}) {
  const c = ink[tone];
  return (
    <article className={cn("grid gap-y-6 p-6 sm:p-8", surface[tone], className)}>
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className={cn("font-display text-[2rem] font-semibold leading-none tracking-[-0.01em] sm:text-[2.25rem]", c.strong)}>
            {plan.name}
          </h3>
          {plan.tag ? <span className="chip chip-accent">{plan.tag}</span> : null}
        </div>
        <p className={cn("mt-3 max-w-[34ch]", c.soft)}>{plan.summary}</p>
      </div>
      <div>
        <PriceTag value={plan.price} label={plan.priceLabel} tone={tone} />
        <p className={cn("mt-2 text-sm", c.note)}>{plan.note}</p>
      </div>
      <div className="self-start">
        <MarketingButtonLink href={plan.href} tone={plan.buttonTone} className="w-full">
          {plan.cta}
        </MarketingButtonLink>
      </div>
      <div className={cn("border-t pt-5", tone === "dark" ? "border-paper/15" : "border-rule")}>
        <p className={cn("text-sm font-semibold", c.strong)}>{plan.includesLabel}</p>
        <ul className={cn("mt-3 space-y-2.5", featureColumns === 2 && "sm:grid sm:grid-cols-2 sm:gap-x-6 sm:space-y-0 sm:gap-y-2.5")}>
          {plan.features.map((feature) => (
            <li key={feature} className={cn("flex items-start gap-3 text-[0.9375rem] leading-6", c.soft)}>
              <CheckIcon className={c.check} />
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
    buttonTone: "ink",
    includesLabel: ui.includes,
    features: plan.features,
  };
}

/** The One Event plan on its own, for the couples page. */
export function OneTimePlanCard({ compact = false, featureColumns = 1 }: { compact?: boolean; featureColumns?: 1 | 2 }) {
  const locale = extractLocale(usePathname());
  const column = oneEventColumn(locale);
  return (
    <Column
      plan={{ ...column, buttonTone: "accent" }}
      tone="light"
      featureColumns={featureColumns}
      className={compact ? "max-w-xl" : undefined}
    />
  );
}

/** A group's heading above its cards: what kind of purchase these are. */
function GroupHead({ title, note, children, className }: { title: string; note: string; children?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-3 pb-1", className)}>
      <div>
        <p className="font-display text-[1.5rem] font-semibold leading-tight text-ink">{title}</p>
        <p className="mt-1 text-ink-2">{note}</p>
      </div>
      {children}
    </header>
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

  const photographerColumns: (PlanColumn & { featured: boolean })[] = plans.map((plan) => ({
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
    buttonTone: plan.featured ? "accent" : "ghost",
    includesLabel: ui.includes,
    features: plan.features,
    featured: plan.featured,
  }));

  const segment =
    "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] px-4 text-[0.9375rem] sm:px-5 font-semibold transition-colors duration-[var(--dur-micro)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

  // On wide screens: row 1 holds the two group heads, rows 2 to 5 the cards'
  // subgrid rows. On a phone the DOM order is the reading order: the
  // photographer head, its two plans, then the one-time head and its plan.
  const cardRows = "lg:row-span-4 lg:row-start-2 lg:grid-rows-subgrid";

  return (
    <div className="grid gap-y-5 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto_1fr] lg:gap-x-6 lg:gap-y-6">
      <GroupHead
        title={ui.photographerGroup}
        note={ui.photographerGroupNote}
        className="lg:col-span-2 lg:col-start-1 lg:row-start-1"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
      </GroupHead>

      {photographerColumns.map((plan, i) => (
        <Column
          key={plan.key}
          plan={plan}
          tone={plan.featured ? "dark" : "light"}
          className={cn(cardRows, i === 0 ? "lg:col-start-1" : "lg:col-start-2")}
        />
      ))}

      {/* The switch to a different kind of purchase: its own head, and on a
          phone a clear break from the subscriptions above it. */}
      <GroupHead
        title={ui.oneTimeGroup}
        note={ui.oneTimeGroupNote}
        className="mt-[var(--space-xl)] border-t border-rule pt-[var(--space-xl)] lg:col-start-3 lg:row-start-1 lg:mt-0 lg:ml-6 lg:border-t-0 lg:pt-0"
      />
      <Column plan={oneEvent} tone="tint" className={cn(cardRows, "lg:col-start-3 lg:ml-6")} />
    </div>
  );
}
