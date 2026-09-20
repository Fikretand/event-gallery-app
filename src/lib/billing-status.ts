import type { AccountType, PhotographerPlanTier, SubscriptionStatus, UserRecord } from "@/lib/types";

/**
 * Plain descriptions of what an account is on and whether it is paying.
 *
 * Kept free of `env` and of any server-only import so the admin table, which
 * is a client component, can use exactly the same wording as the server pages.
 */

export type BillingTone = "paid" | "trial" | "overdue" | "ended" | "admin";

export type BillingDescription = {
  /** What the account is subscribed to, e.g. "Pro" or "One Event". */
  plan: string;
  /** Whether money is actually coming in, e.g. "Active" or "Free trial". */
  status: string;
  /** Who is billing them, when anyone is — "polar", "payhip", "manual". */
  provider: string | null;
  tone: BillingTone;
};

/**
 * `plan_tier` is a photographer concept. Couple accounts carry the column's
 * default ("solo") and it means nothing for them, so showing it reads as if
 * every couple were on a photographer plan — which is what made the admin
 * list confusing. Couples buy One Event instead.
 */
export function describePlan(
  accountType: AccountType,
  planTier: PhotographerPlanTier,
): string {
  if (accountType === "couple") return "One Event";
  return planTier === "pro" ? "Pro" : "Solo";
}

export function describeBilling(
  user: Pick<
    UserRecord,
    "account_type" | "plan_tier" | "role" | "subscription_status" | "subscription_provider"
  >,
): BillingDescription {
  const plan = describePlan(user.account_type, user.plan_tier);
  const provider = user.subscription_provider ?? null;
  const status: SubscriptionStatus = user.subscription_status ?? null;

  // Admins bypass every limit regardless of what they have paid for, so
  // saying anything else here would misrepresent what they can actually do.
  if (user.role === "admin") {
    return { plan, status: "Admin · no limits", provider, tone: "admin" };
  }

  switch (status) {
    case "active":
      return { plan, status: "Paid", provider, tone: "paid" };
    case "trialing":
      return { plan, status: "Provider trial", provider, tone: "paid" };
    case "past_due":
      return { plan, status: "Past due", provider, tone: "overdue" };
    case "canceled":
      return { plan, status: "Canceled", provider, tone: "ended" };
    default:
      // No provider record at all: they are on the built-in free trial. Whether
      // that trial has run out depends on photo count as well as age, which
      // needs a per-user query — the user detail page shows it, this does not
      // claim it.
      return { plan, status: "Free trial", provider: null, tone: "trial" };
  }
}

export const BILLING_TONE_CLASS: Record<BillingTone, string> = {
  paid: "bg-[#e8f6ec] text-[#1f6b35]",
  trial: "bg-black/6 text-black/50",
  overdue: "bg-red-100 text-red-700",
  ended: "bg-orange-100 text-orange-700",
  admin: "bg-[var(--color-accent)]/12 text-[var(--color-accent)]",
};
