import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { Panel } from "@/components/ui/panel";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { hasActiveSubscription, hasPayments, PLAN_PRICING } from "@/lib/billing";
import { computeTrialState, countUserMediaFiles } from "@/lib/events";
import { env, hasSupabase } from "@/lib/env";
import { getDictionary, t, type Locale } from "@/lib/i18n/index";
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
  const prefix = locale === "en" ? "" : `/${locale}`;

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

  const planLabel = isCouple ? b.oneEvent : currentPlan === "pro" ? "Pro" : "Solo";
  const status = (() => {
    if (isAdmin) return { label: b.planLabelAdminNote, tone: "moss" as const };
    if (isActiveSub) return { label: t(b.planLabelActive, { plan: planLabel }), tone: "moss" as const };
    if (trial?.status === "active")
      return {
        label: t(b.trialActiveLabel, {
          days: String(trial.daysLeft),
          s: trial.daysLeft === 1 ? "" : "s",
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
        action={
          <Link
            href={isCouple ? `${prefix}/dashboard/couple` : `${prefix}/dashboard`}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-white"
          >
            {b.backToDashboard}
          </Link>
        }
      />

      <section className="shell grid gap-5">
        {searchParams?.success === "1" && (
          <div className="rounded-2xl bg-[#eef9f0] px-4 py-3 text-sm text-[#1f6b35]">{b.paymentReceived}</div>
        )}

        {/* Current status */}
        <Panel className="bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{b.currentPlan}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {isAdmin ? b.planLabelAdmin : planLabel}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                status.tone === "moss"
                  ? "bg-[var(--color-moss)]/12 text-[var(--color-moss)]"
                  : status.tone === "red"
                    ? "bg-red-100 text-red-600"
                    : "bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
              }`}
            >
              {status.label}
            </span>
          </div>

          {trial?.status === "active" && !isActiveSub && !isAdmin && (
            <div className="mt-4 rounded-xl bg-[var(--color-paper)]/60 px-4 py-3">
              <p className="text-xs font-medium text-black/55">
                {t(b.trialPhotosUsed, { used: String(trial.photosUsed), limit: String(trial.photosLimit) })}
              </p>
              <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${Math.min((trial.photosUsed / trial.photosLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </Panel>

        {/* Plan chooser */}
        {!isAdmin && !isCouple && (
          <BillingPlans
            currentPlan={currentPlan}
            isActiveSub={isActiveSub}
            paymentsEnabled={hasPayments}
            pricing={PLAN_PRICING}
          />
        )}
        {!isAdmin && isCouple && (
          <Panel className="bg-white/90">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{b.upgradeYourPlan}</p>
            <div className="mt-4 rounded-[20px] border border-[#e8d2c4] bg-[linear-gradient(160deg,rgba(255,253,250,0.98),rgba(248,230,218,0.60))] p-5">
              <p className="text-lg font-semibold text-[var(--color-ink)]">{b.oneEvent}</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-[var(--color-ink)]">€39</span>
                <span className="text-sm text-black/45">{b.oneTime}</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {[
                  "1 private event",
                  "Unlimited guest photo uploads",
                  "Guest videos included",
                  "Private gallery with PIN",
                  "Gallery sections",
                  "Download all as ZIP",
                  "30-day upload window",
                  "90 days of access",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-black/65">
                    <span className="mt-0.5 text-[var(--color-moss)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <CoupleCheckoutButton
                productKey={env.payhipProductOneEvent ?? ""}
                userEmail={user.email ?? ""}
                paymentsEnabled={hasPayments && Boolean(env.payhipProductOneEvent)}
              />
            </div>
          </Panel>
        )}
      </section>
    </main>
  );
}
