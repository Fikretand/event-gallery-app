"use client";

import { useState, useTransition } from "react";

import { t, type Dict } from "@/lib/i18n/index";
import { CheckIcon } from "@/components/ui/check-icon";

type PlanId = "solo" | "pro";
type Cycle = "monthly" | "yearly";

const PLAN_META: Record<PlanId, { name: string; accent: boolean }> = {
  solo: { name: "Solo", accent: false },
  pro: { name: "Pro", accent: true },
};

export function BillingPlans({
  currentPlan,
  isActiveSub,
  paymentsEnabled,
  pricing,
  currency,
  strings,
}: {
  currentPlan: PlanId;
  isActiveSub: boolean;
  paymentsEnabled: boolean;
  pricing: Record<PlanId, Record<Cycle, number>>;
  /** Polar bills in BAM; the legacy providers bill in EUR. */
  currency: "BAM" | "EUR";
  strings: Dict["dashboard"]["billingPlans"];
}) {
  const s = strings;
  const features: Record<PlanId, string[]> = { solo: s.soloFeatures, pro: s.proFeatures };
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function choose(plan: PlanId) {
    setNotice(null);
    setBusyPlan(plan);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, cycle }),
        });
        if (res.ok) {
          const { url } = await res.json();
          if (url) {
            window.location.href = url;
            return;
          }
        }
        if (res.status === 503) {
          setNotice(s.paymentsNote);
        } else {
          const { error } = await res.json().catch(() => ({ error: s.genericError }));
          setNotice(error ?? s.genericError);
        }
      } catch {
        setNotice(s.networkError);
      } finally {
        setBusyPlan(null);
      }
    });
  }

  const plans: PlanId[] = ["solo", "pro"];

  return (
    <div className="space-y-[var(--space-lg)]">
      {/* Billing cycle toggle */}
      <div role="group" aria-label={`${s.yearly} / ${s.monthly}`} className="inline-flex rounded-full bg-paper-2 p-1 text-sm">
        {(["yearly", "monthly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cycle === c}
            onClick={() => setCycle(c)}
            className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 font-semibold transition-colors duration-[var(--dur-micro)] ${
              cycle === c ? "bg-card text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {c === "yearly" ? s.yearly : s.monthly}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" className="notice notice-info">
          {notice}
        </div>
      )}

      {/* The two plans as columns of one table, parted by a hairline. */}
      <div className="grid border-t border-rule md:grid-cols-2 md:divide-x md:divide-rule">
        {plans.map((plan) => {
          const meta = PLAN_META[plan];
          const planFeatures = features[plan];
          const price = pricing[plan][cycle];
          const isCurrent = isActiveSub && currentPlan === plan;
          const isBusy = pending && busyPlan === plan;

          return (
            <div key={plan} className="flex flex-col border-b border-rule py-[var(--space-lg)] md:border-b-0 md:px-[var(--space-lg)] md:first:pl-0">
              <p className="flex items-center gap-3">
                <span className="app-section-title text-ink">{meta.name}</span>
                {meta.accent ? <span className="chip chip-accent">{s.mostPopular}</span> : null}
              </p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="num font-display text-[2.25rem] font-semibold leading-none text-ink">
                  {currency === "BAM" ? `${price} KM` : `\u20AC${price}`}
                </span>
                <span className="text-sm text-muted">{s.perMonth}</span>
              </p>
              <p className="meta mt-1">{cycle === "yearly" ? s.billedYearly : s.billedMonthly}</p>

              <ul className="mt-[var(--space-md)] flex-1 space-y-2">
                {planFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-ink-2">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => choose(plan)}
                disabled={isCurrent || isBusy}
                aria-busy={isBusy}
                className={`btn mt-[var(--space-lg)] w-full ${isCurrent ? "btn-secondary" : meta.accent ? "btn-primary" : "btn-secondary"}`}
              >
                {isCurrent
                  ? s.currentPlan
                  : isBusy
                    ? s.starting
                    : isActiveSub
                      ? t(s.switchTo, { name: meta.name })
                      : t(s.get, { name: meta.name })}
              </button>
            </div>
          );
        })}
      </div>

      {!paymentsEnabled && <p className="meta">{s.paymentsUnavailable}</p>}
    </div>
  );
}
