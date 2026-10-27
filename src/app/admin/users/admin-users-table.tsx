"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

import { BILLING_TONE_CLASS, describeBilling } from "@/lib/billing-status";
import type { UserRecord } from "@/lib/types";

type Filter = "all" | "photographer" | "couple" | "paying" | "canceled" | "admin";

export function AdminUsersTable({ users }: { users: UserRecord[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (filter === "photographer" && u.account_type !== "photographer") return false;
      if (filter === "couple" && u.account_type !== "couple") return false;
      const paying = u.subscription_status === "active" || u.subscription_status === "trialing";
      if (filter === "paying" && !paying) return false;
      if (filter === "canceled" && u.subscription_status !== "canceled") return false;
      if (filter === "admin" && u.role !== "admin") return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, filter]);

  const counts = useMemo(() => ({
    all: users.length,
    photographer: users.filter((u) => u.account_type === "photographer").length,
    couple: users.filter((u) => u.account_type === "couple").length,
    paying: users.filter(
      (u) => u.subscription_status === "active" || u.subscription_status === "trialing",
    ).length,
    canceled: users.filter((u) => u.subscription_status === "canceled").length,
    admin: users.filter((u) => u.role === "admin").length,
  }), [users]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "photographer", label: `Photographers (${counts.photographer})` },
    { key: "couple", label: `Couples (${counts.couple})` },
    { key: "paying", label: `Paying (${counts.paying})` },
    { key: "canceled", label: `Canceled (${counts.canceled})` },
    { key: "admin", label: `Admin (${counts.admin})` },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-card shadow-[0_18px_50px_color-mix(in_oklch,_var(--color-ink)_5%,_transparent)]">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-muted hover:bg-black/6 hover:text-[var(--color-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-xl border border-rule bg-[var(--color-paper)]/60 py-2 pl-8 pr-3 text-sm placeholder-black/28 outline-none focus:border-[var(--color-ink)]/25 sm:w-52"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/[0.02]">
              {["User", "Type", "Plan", "Billing", "Role", "Joined", ""].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {filtered.map((user) => {
              const initials = (user.full_name ?? user.email)
                .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const billing = describeBilling(user);

              return (
                <tr key={user.id} className="group transition-colors hover:bg-black/[0.015]">
                  {/* User */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-xs font-bold text-[var(--color-ink)]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-ink)]">
                          {user.full_name ?? <span className="text-muted">No name</span>}
                        </p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      user.account_type === "photographer"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-purple-50 text-purple-700"
                    }`}>
                      {user.account_type}
                    </span>
                  </td>

                  {/* Plan — "solo" is meaningless on a couple account */}
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      billing.plan === "Pro"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-black/6 text-muted"
                    }`}>
                      {billing.plan}
                    </span>
                  </td>

                  {/* Billing */}
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BILLING_TONE_CLASS[billing.tone]}`}
                    >
                      {billing.status}
                    </span>
                    {billing.provider && (
                      <span className="ml-1.5 text-xs text-muted">{billing.provider}</span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    {user.role === "admin" ? (
                      <span className="rounded-full bg-[var(--color-accent)]/12 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>

                  {/* View */}
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="rounded-lg border border-rule bg-white px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-rule-2 hover:text-[var(--color-ink)]"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted">
                  No users match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
