import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { CheckIcon } from "@/components/ui/check-icon";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import {
  hasActiveSubscription,
  hasPayments,
  hasPolar,
  ONE_EVENT_PRICE,
  planPricingFor,
} from "@/lib/billing";
import { computeTrialState, countUserMediaFiles } from "@/lib/events";
import { env, hasSupabase } from "@/lib/env";
import { getDictionary, localePrefix, t, type Locale, daysWord } from "@/lib/i18n/index";
import { BillingPlans } from "./billing-plans";
import { CoupleCheckoutButton } from "./couple-checkout-button";

export async function DashboardBilling({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: { success?: string };
}) {
  const d = getDictionary(locale).dashboard;
  const b = d.billing;
  const prefix = localePrefix(locale);

  if (!hasSupabase) redirect(`${prefix}/dashboard`);

  const { user, supabase } = await getRequiredUser();
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);

  const isCouple = accountType === "couple";
  const [profile, photosUsed] = await Promise.all([
    getUserProfile(supabase, user.id),
    countUserMediaFiles(user.id),
  ]);

  const isAdmin = profile?.role === "admin";
  const isActiveSub = profile ? hasActiveSubscription(profile) : false;
  const currentPlan = profile?.plan_tier === "pro" ? "pro" : "solo";
  const trial = profile
    ? computeTrialState(profile.created_at, profile.plan_tier, photosUsed, profile.role, profile.subscription_status)
    : null;

  if (isCouple && isActiveSub) redirect(`${prefix}/dashboard/couple`);

  // Polar is preferred for the One Event purchase when its product is set up;
  // otherwise fall back to the legacy Payhip overlay.
  const oneEventProvider = hasPolar && env.polarProductOneEvent ? "polar" : "payhip";
  const oneEventPrice = ONE_EVENT_PRICE[oneEventProvider];
  // Photographer plans follow whichever provider will take the payment.
  const subscriptionProvider = hasPolar && env.polarProductSoloMonthly ? "polar" : "payhip";
  const { pricing: planPricing, currency: planCurrency } = planPricingFor(subscriptionProvider);

  const planLabel = isCouple ? b.oneEvent : currentPlan === "pro" ? "Pro" : "Solo";
  const status = (() => {
    if (isAdmin) return { label: b.planLabelAdminNote, tone: "moss" as const };
    if (isActiveSub) return { label: t(b.planLabelActive, { plan: planLabel }), tone: "moss" as const };
    if (trial?.status === "active")
      return {
        label: t(b.trialActiveLabel, {
          days: String(trial.daysLeft),
          unit: daysWord(trial.daysLeft, locale),
        }),
        tone: "accent" as const,
      };
    if (trial?.status === "expired") return { label: b.trialExpired, tone: "red" as const };
    return { label: b.freeTrial, tone: "accent" as const };
  })();

  return (
    <main className="pb-16">
      <DashboardHeader
        title={b.title}
        eyebrow={b.eyebrow}
        isAdmin={isAdmin}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
        back={{ href: isCouple ? `${prefix}/dashboard/couple` : `${prefix}/dashboard`, label: b.backToDashboard }}
      />

      <section className="shell grid gap-[var(--space-xl)]">
        {searchParams?.success === "1" && (
          <div role="status" className="notice notice-success">{b.paymentReceived}</div>
        )}

        {/* Current status */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-[var(--space-lg)]">
          <div>
            <p className="text-sm text-ink-2">{b.currentPlan}</p>
            <p className="mt-1 font-display text-[2rem] font-semibold leading-none text-ink">{isAdmin ? b.planLabelAdmin : planLabel}</p>
          </div>
          <span className={`chip font-semibold ${status.tone === "moss" ? "chip-moss" : status.tone === "red" ? "chip-error" : "chip-accent"}`}>
            {status.label}
          </span>
          {trial?.status === "active" && !isActiveSub && !isAdmin && (
            <div className="w-full">
              <p className="text-sm text-ink-2">
                {t(b.trialPhotosUsed, { used: String(trial.photosUsed), limit: String(trial.photosLimit) })}
              </p>
              <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-paper-3">
                <div
                  className="h-full origin-left rounded-full bg-accent"
                  style={{ transform: `scaleX(${Math.min(trial.photosUsed / trial.photosLimit, 1)})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Plan chooser */}
        {!isAdmin && !isCouple && (
          <BillingPlans
            currentPlan={currentPlan}
            isActiveSub={isActiveSub}
            paymentsEnabled={hasPayments}
            pricing={planPricing}
            currency={planCurrency}
            strings={d.billingPlans}
          />
        )}
        {!isAdmin && isCouple && (
          <section>
            <h2 className="app-section-title text-ink">{b.upgradeYourPlan}</h2>
            <div className="card mt-[var(--space-md)] max-w-xl p-[var(--space-lg)]">
              <p className="font-semibold text-ink">{b.oneEvent}</p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="num font-display text-[2.25rem] font-semibold leading-none text-ink">{oneEventPrice}</span>
                <span className="text-sm text-muted">{b.oneTime}</span>
              </p>
              <ul className="mt-[var(--space-md)] space-y-2">
                {b.oneEventFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-ink-2">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <CoupleCheckoutButton
                provider={oneEventProvider}
                productKey={env.payhipProductOneEvent ?? ""}
                userEmail={user.email ?? ""}
                paymentsEnabled={
                  oneEventProvider === "polar"
                    ? true
                    : hasPayments && Boolean(env.payhipProductOneEvent)
                }
                priceLabel={oneEventPrice}
                strings={b}
              />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
