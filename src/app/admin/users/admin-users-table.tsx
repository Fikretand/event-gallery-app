"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

import { formatBytes } from "@/lib/utils";
import type { UserRecord, TrialState } from "@/lib/types";

type Row = {
  user: UserRecord;
  stats: {
    eventCount: number;
    photosUsed: number;
    storageUsed: number;
    storageLimitBytes: number;
    trial: TrialState;
  };
};

type Filter = "all" | "photographer" | "couple" | "pro" | "trial" | "admin";

export function AdminUsersTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(({ user, stats }) => {
      if (filter === "photographer" && user.account_type !== "photographer") return false;
      if (filter === "couple" && user.account_type !== "couple") return false;
      if (filter === "pro" && user.plan_tier !== "pro") return false;
      if (filter === "trial" && stats.trial.status !== "active") return false;
      if (filter === "admin" && user.role !== "admin") return false;
      if (!q) return true;
      return (
        user.email.toLowerCase().includes(q) ||
        (user.full_name ?? "").toLowerCase().includes(q) ||
        (user.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${rows.length})` },
    { key: "photographer", label: "Photographers" },
    { key: "couple", label: "Couples" },
    { key: "pro", label: "Pro" },
    { key: "trial", label: "Trial" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-black/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-black/50 hover:bg-black/6 hover:text-[var(--color-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-black/10 bg-[var(--color-paper)]/60 py-2 pl-8 pr-3 text-sm text-[var(--color-ink)] placeholder-black/30 outline-none focus:border-[var(--color-ink)]/30 focus:ring-2 focus:ring-[var(--color-ink)]/8 sm:w-60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/[0.025]">
              {["User", "Type", "Plan", "Trial", "Events", "Storage", "Joined", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {filtered.map(({ user, stats }) => {
              const initials = (user.full_name ?? user.email)
                .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              const storageRatio = stats.storageLimitBytes > 0
                ? Math.min((stats.storageUsed / stats.storageLimitBytes) * 100, 100)
                : 0;

              return (
                <tr key={user.id} className="group transition hover:bg-black/[0.02]">
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-xs font-bold text-[var(--color-ink)]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-ink)]">{user.full_name ?? "—"}</p>
                        <p className="truncate text-xs text-black/42">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
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
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      user.plan_tier === "pro"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-black/6 text-black/55"
                    }`}>
                      {user.role === "admin" ? "Admin · " : ""}{user.plan_tier}
                    </span>
                  </td>

                  {/* Trial */}
                  <td className="px-4 py-3">
                    {stats.trial.status === "active" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {stats.trial.daysLeft}d left
                      </span>
                    )}
                    {stats.trial.status === "expired" && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Expired
                      </span>
                    )}
                    {stats.trial.status === "none" && (
                      <span className="text-black/25">—</span>
                    )}
                  </td>

                  {/* Events */}
                  <td className="px-4 py-3 tabular-nums text-black/60">{stats.eventCount}</td>

                  {/* Storage */}
                  <td className="px-4 py-3">
                    <div className="w-28">
                      <p className="text-xs tabular-nums text-black/55">{formatBytes(stats.storageUsed)}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
                        <div
                          className={`h-full rounded-full transition-all ${storageRatio > 85 ? "bg-red-500" : "bg-[var(--color-moss)]"}`}
                          style={{ width: `${storageRatio}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-xs text-black/45">
                    {new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>

                  {/* View */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/60 opacity-0 transition hover:border-[var(--color-ink)]/20 hover:text-[var(--color-ink)] group-hover:opacity-100"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-black/35">
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
