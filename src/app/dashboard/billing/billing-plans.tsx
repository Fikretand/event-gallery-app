"use client";

import { useState, useTransition } from "react";

import { t, type Dict } from "@/lib/i18n/index";

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
  strings,
}: {
  currentPlan: PlanId;
  isActiveSub: boolean;
  paymentsEnabled: boolean;
  pricing: Record<PlanId, Record<Cycle, number>>;
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
    <div className="space-y-4">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 text-sm">
          {(["yearly", "monthly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 font-semibold transition ${
                cycle === c ? "bg-[var(--color-ink)] text-white" : "text-black/55 hover:text-[var(--color-ink)]"
              }`}
            >
              {c === "yearly" ? s.yearly : s.monthly}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-4 py-3 text-sm text-[var(--color-ink)]">
          {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const meta = PLAN_META[plan];
          const planFeatures = features[plan];
          const price = pricing[plan][cycle];
          const isCurrent = isActiveSub && currentPlan === plan;
          const isBusy = pending && busyPlan === plan;

          return (
            <div
              key={plan}
              className={`relative overflow-hidden rounded-[24px] border p-6 ${
                meta.accent
                  ? "border-amber-200/70 bg-[linear-gradient(160deg,rgba(255,248,235,0.95),rgba(255,238,205,0.6))]"
                  : "border-black/8 bg-white/90"
              }`}
            >
              {meta.accent && (
                <span className="absolute right-5 top-5 rounded-full bg-amber-200/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  {s.mostPopular}
                </span>
              )}
              <p className="text-lg font-semibold text-[var(--color-ink)]">{meta.name}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-[var(--color-ink)]">€{price}</span>
                <span className="text-sm text-black/45">{s.perMonth}</span>
              </p>
              <p className="mt-0.5 text-xs text-black/45">
                {cycle === "yearly" ? s.billedYearly : s.billedMonthly}
              </p>

              <ul className="mt-4 space-y-2">
                {planFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-black/65">
                    <span className="mt-0.5 text-[var(--color-moss)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => choose(plan)}
                disabled={isCurrent || isBusy}
                className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-black/8 text-black/40"
                    : meta.accent
                      ? "bg-[var(--color-accent)] text-white hover:brightness-105 disabled:opacity-60"
                      : "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]/90 disabled:opacity-60"
                }`}
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

      {!paymentsEnabled && (
        <p className="text-center text-xs text-black/45">{s.paymentsUnavailable}</p>
      )}
    </div>
  );
}
