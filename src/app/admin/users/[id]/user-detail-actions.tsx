"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { CheckIcon } from "@/components/ui/icons";
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
    <div className="overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-card">
      <div className="border-b border-rule px-5 py-3.5">
        <p className="text-xs font-semibold text-muted">Actions</p>
      </div>

      <div className="space-y-5 px-5 py-5">
        {error && (
          <div role="alert" className="notice notice-error">{error}</div>
        )}

        {/* Plan — photographer tiers only; a couple account has no tier */}
        {user.account_type === "couple" ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-2">Plan</p>
            <div className="well px-4 py-2.5 text-sm font-semibold text-ink">
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
                aria-pressed={user.plan_tier === p}
                className={`btn btn-sm flex-1 ${user.plan_tier === p ? "btn-ink" : "btn-secondary"}`}
              >
                {p === user.plan_tier && <CheckIcon className="mr-1 inline h-4 w-4 align-[-3px]" />}{p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Admin role */}
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-2">Admin access</p>
          <button
            type="button"
            onClick={handleRoleToggle}
            disabled={pending}
            className={`btn btn-sm w-full ${user.role === "admin" ? "btn-danger-quiet" : "btn-secondary"}`}
          >
            {user.role === "admin" ? "Admin: click to revoke" : "Grant admin access"}
          </button>
        </div>

        {/* Subscription (manual activation — bank transfer path) */}
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-2">Subscription</p>
          <button
            type="button"
            onClick={handleSubscriptionToggle}
            disabled={pending}
            className="btn btn-sm btn-secondary w-full"
          >
            {isPaid ? "Active (paid): click to revert to trial" : "Mark as paid (active subscriber)"}
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
              className="btn btn-sm btn-danger-quiet w-full"
            >
              Delete user account
            </button>
          ) : (
            <div className="space-y-2">
              <p role="alert" className="notice notice-error">
                This will permanently delete <strong>{user.email}</strong> and cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="btn btn-sm btn-danger flex-1"
                >
                  {pending ? "Deleting…" : "Yes, delete permanently"}
                </button>
                <button
                  onClick={() => setDeleteStep("idle")}
                  disabled={pending}
                  className="btn btn-sm btn-secondary flex-1"
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
