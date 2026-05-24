import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { Panel } from "@/components/ui/panel";
import { resolveAccountRedirect } from "@/lib/account";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { hasActiveSubscription, hasPayments, PLAN_PRICING } from "@/lib/billing";
import { computeTrialState, countUserMediaFiles } from "@/lib/events";
import { hasSupabase } from "@/lib/env";
import { BillingPlans } from "./billing-plans";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  if (!hasSupabase) redirect("/dashboard");

  const { user, supabase } = await getRequiredUser();
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
  if (accountType === "couple") {
    redirect(resolveAccountRedirect(accountType, { eventSlug: null }));
  }

  const resolved = searchParams ? await searchParams : undefined;
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

  // Human-readable current status
  const status = (() => {
    if (isAdmin) return { label: "Admin · no limits", tone: "moss" as const };
    if (isActiveSub) return { label: `${currentPlan === "pro" ? "Pro" : "Solo"} · active`, tone: "moss" as const };
    if (trial?.status === "active") return { label: `Free trial · ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left`, tone: "accent" as const };
    if (trial?.status === "expired") return { label: "Free trial · expired", tone: "red" as const };
    return { label: "Free trial", tone: "accent" as const };
  })();

  return (
    <main className="pb-16">
      <DashboardHeader
        title="Plan & billing"
        eyebrow="Choose a plan, upgrade, or manage your subscription"
        isAdmin={isAdmin}
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-white"
          >
            ← Dashboard
          </Link>
        }
      />

      <section className="shell grid gap-5">
        {resolved?.success === "1" && (
          <div className="rounded-2xl bg-[#eef9f0] px-4 py-3 text-sm text-[#1f6b35]">
            Payment received — your plan is being activated. It may take a few seconds to reflect here.
          </div>
        )}

        {/* Current status */}
        <Panel className="bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Current plan</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {isAdmin ? "Admin" : currentPlan === "pro" ? "Pro" : "Solo"}
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
                {trial.photosUsed} / {trial.photosLimit} trial photos used
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

        {/* Plan chooser (hidden for admins — they already have no limits) */}
        {!isAdmin && (
          <BillingPlans
            currentPlan={currentPlan}
            isActiveSub={isActiveSub}
            paymentsEnabled={hasPayments}
            pricing={PLAN_PRICING}
          />
        )}
      </section>
    </main>
  );
}
