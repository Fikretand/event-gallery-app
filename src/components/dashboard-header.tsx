import Link from "next/link";

import { signOutAction } from "@/lib/actions";

export interface DashboardHeaderStrings {
  profile: string;
  signOut: string;
  admin: string;
}

const DEFAULT_STRINGS: DashboardHeaderStrings = {
  profile: "Profile",
  signOut: "Sign out",
  admin: "⚡ Admin",
};

export function DashboardHeader({
  title,
  eyebrow,
  action,
  isAdmin,
  strings,
  profileHref = "/dashboard/profile",
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  isAdmin?: boolean;
  strings?: DashboardHeaderStrings;
  profileHref?: string;
}) {
  const s = strings ?? DEFAULT_STRINGS;
  return (
    <header className="shell flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
          Confetti
        </Link>
        {eyebrow ? <p className="text-sm font-medium text-black/55">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && (
          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-4 py-2 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/14"
          >
            {s.admin}
          </Link>
        )}
        <Link
          href={profileHref}
          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-white"
        >
          {s.profile}
        </Link>
        {action}
        <form action={signOutAction}>
          <button className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-white">
            {s.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
