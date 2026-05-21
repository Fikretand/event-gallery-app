import Link from "next/link";

import { signOutAction } from "@/lib/actions";

export function DashboardHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="shell flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
          Confetti
        </Link>
        {eyebrow ? <p className="text-sm font-medium text-black/55">{eyebrow}</p> : null}
        <h1 className="text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-white"
        >
          Profile
        </Link>
        {action}
        <form action={signOutAction}>
          <button className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-white">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
