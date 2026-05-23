"use client";

import { useTransition, useState } from "react";

import { adminSetPlanAction, adminSetRoleAction, adminDeleteUserAction } from "@/lib/admin-actions";
import { formatBytes } from "@/lib/utils";
import type { UserRecord, TrialState } from "@/lib/types";

type Stats = {
  eventCount: number;
  photosUsed: number;
  storageUsed: number;
  trial: TrialState;
};

export function AdminUserRow({ user, stats }: { user: UserRecord; stats: Stats }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handlePlanChange(newPlan: "solo" | "pro") {
    if (newPlan === user.plan_tier) return;
    startTransition(() => adminSetPlanAction(user.id, newPlan));
  }

  function handleRoleToggle() {
    const newRole = user.role === "admin" ? "photographer" : "admin";
    startTransition(() => adminSetRoleAction(user.id, newRole));
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(() => adminDeleteUserAction(user.id));
  }

  const trialBadge = () => {
    if (stats.trial.status === "active") {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Active · {stats.trial.daysLeft}d
        </span>
      );
    }
    if (stats.trial.status === "expired") {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
          Expired
        </span>
      );
    }
    return <span className="text-black/30">—</span>;
  };

  return (
    <tr className={pending ? "opacity-50" : undefined}>
      {/* User */}
      <td className="px-4 py-3">
        <div className="max-w-[200px]">
          <p className="truncate font-medium text-[var(--color-ink)]">{user.full_name ?? "—"}</p>
          <p className="truncate text-xs text-black/45">{user.email}</p>
        </div>
      </td>

      {/* Account type */}
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
          user.account_type === "photographer"
            ? "bg-blue-50 text-blue-700"
            : "bg-purple-50 text-purple-700"
        }`}>
          {user.account_type}
        </span>
      </td>

      {/* Plan */}
      <td className="px-4 py-3">
        <select
          value={user.plan_tier}
          onChange={(e) => handlePlanChange(e.target.value as "solo" | "pro")}
          disabled={pending}
          className="rounded-lg border border-black/12 bg-white px-2 py-1 text-xs font-medium focus:outline-none"
        >
          <option value="solo">Solo</option>
          <option value="pro">Pro</option>
        </select>
      </td>

      {/* Trial */}
      <td className="px-4 py-3">{trialBadge()}</td>

      {/* Events */}
      <td className="px-4 py-3 tabular-nums text-black/70">{stats.eventCount}</td>

      {/* Photos */}
      <td className="px-4 py-3 tabular-nums text-black/70">{stats.photosUsed}</td>

      {/* Storage */}
      <td className="px-4 py-3 tabular-nums text-black/70">{formatBytes(stats.storageUsed)}</td>

      {/* Joined */}
      <td className="px-4 py-3 text-xs text-black/50">
        {new Date(user.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRoleToggle}
            disabled={pending}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              user.role === "admin"
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-black/6 text-black/55 hover:bg-black/10"
            }`}
          >
            {user.role === "admin" ? "Admin ✓" : "Make admin"}
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg bg-black/6 px-2.5 py-1 text-xs text-black/55 hover:bg-black/10"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              disabled={pending}
              className="rounded-lg bg-black/6 px-2.5 py-1 text-xs text-black/55 transition hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
