"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { adminSetPlanAction, adminSetRoleAction, adminDeleteUserAction, adminSetSubscriptionAction } from "@/lib/admin-actions";
import type { UserRecord } from "@/lib/types";

export function UserDetailActions({ user }: { user: UserRecord }) {
  const [pending, startTransition] = useTransition();
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handlePlanChange(plan: "solo" | "pro") {
    if (plan === user.plan_tier) return;
    run(() => adminSetPlanAction(user.id, plan));
  }

  function handleRoleToggle() {
    const next = user.role === "admin" ? "photographer" : "admin";
    run(() => adminSetRoleAction(user.id, next));
  }

  const isPaid = user.subscription_status === "active" || user.subscription_status === "trialing";
  function handleSubscriptionToggle() {
    run(() => adminSetSubscriptionAction(user.id, isPaid ? null : "active"));
  }

  function handleDelete() {
    if (deleteStep === "idle") { setDeleteStep("confirm"); return; }
    run(async () => {
      await adminDeleteUserAction(user.id);
      router.push("/admin/users");
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-card shadow-[0_18px_50px_color-mix(in_oklch,_var(--color-ink)_5%,_transparent)]">
      <div className="border-b border-rule px-5 py-3.5">
        <p className="text-xs font-semibold text-muted">Actions</p>
      </div>

      <div className="space-y-5 px-5 py-5">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* Plan — photographer tiers only; a couple account has no tier */}
        {user.account_type === "couple" ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-2">Plan</p>
            <div className="rounded-xl border border-rule bg-[var(--color-paper)]/60 px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]">
              One Event
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Couple accounts buy a single event. Solo and Pro are photographer tiers and
              do not apply here.
            </p>
          </div>
        ) : (
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-2">Change plan</p>
          <div className="flex gap-2">
            {(["solo", "pro"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePlanChange(p)}
                disabled={pending}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition ${
                  user.plan_tier === p
                    ? p === "pro"
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-[var(--color-ink)]/20 bg-[var(--color-paper)] text-[var(--color-ink)]"
                    : "border-rule bg-white text-muted hover:border-rule-2 hover:text-[var(--color-ink)]"
                }`}
              >
                {p === user.plan_tier && "✓ "}{p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Admin role */}
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-2">Admin access</p>
          <button
            onClick={handleRoleToggle}
            disabled={pending}
            className={`w-full rounded-xl border py-2.5 text-sm font-semibold transition ${
              user.role === "admin"
                ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/14"
                : "border-rule bg-white text-ink-2 hover:border-rule-2 hover:text-[var(--color-ink)]"
            }`}
          >
            {user.role === "admin" ? "⚡ Admin — click to revoke" : "Grant admin access"}
          </button>
        </div>

        {/* Subscription (manual activation — bank transfer path) */}
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-2">Subscription</p>
          <button
            onClick={handleSubscriptionToggle}
            disabled={pending}
            className={`w-full rounded-xl border py-2.5 text-sm font-semibold transition ${
              isPaid
                ? "border-[var(--color-moss)]/30 bg-[var(--color-moss)]/8 text-[var(--color-moss)] hover:bg-[var(--color-moss)]/14"
                : "border-rule bg-white text-ink-2 hover:border-rule-2 hover:text-[var(--color-ink)]"
            }`}
          >
            {isPaid ? "✓ Active (paid) — click to revert to trial" : "Mark as paid (active subscriber)"}
          </button>
          <p className="mt-1.5 text-xs text-muted">
            Use after a manual/bank-transfer payment. Removes trial limits for this account.
          </p>
        </div>

        {/* Delete */}
        <div className="border-t border-rule pt-5">
          <p className="mb-2 text-xs font-semibold text-ink-2">Danger zone</p>
          {deleteStep === "idle" ? (
            <button
              onClick={handleDelete}
              disabled={pending}
              className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              Delete user account
            </button>
          ) : (
            <div className="space-y-2">
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                This will permanently delete <strong>{user.email}</strong> and cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Yes, delete permanently"}
                </button>
                <button
                  onClick={() => setDeleteStep("idle")}
                  disabled={pending}
                  className="flex-1 rounded-xl border border-rule bg-white py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-black/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {pending && (
          <p className="text-center text-xs text-muted">Saving…</p>
        )}
      </div>
    </div>
  );
}
