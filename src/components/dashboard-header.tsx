import Link from "next/link";

import { ArrowLeftIcon } from "@/components/ui/icons";
import { signOutAction } from "@/lib/actions";

export interface DashboardHeaderStrings {
  profile: string;
  signOut: string;
  admin: string;
}

const DEFAULT_STRINGS: DashboardHeaderStrings = {
  profile: "Profile",
  signOut: "Sign out",
  admin: "Admin",
};

const barLink =
  "inline-flex min-h-10 items-center whitespace-nowrap rounded-[var(--radius-inner)] px-3 text-sm font-medium text-ink-2 transition-colors duration-[var(--dur-micro)] hover:bg-paper-2 hover:text-ink";

/**
 * The app's top bar and the page's title row.
 *
 * The bar is the same on every working screen: the wordmark home, then the
 * account's own links. Under it the page names itself; `context` (the client,
 * the account type) is a line under the title, never a label over it, and
 * `back` is a one-step breadcrumb above it.
 */
export function DashboardHeader({
  title,
  eyebrow: context,
  action,
  back,
  isAdmin,
  strings,
  profileHref = "/dashboard/profile",
}: {
  title: string;
  /** A fact about the page (the client, the account), shown under the title. */
  eyebrow?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
  isAdmin?: boolean;
  strings?: DashboardHeaderStrings;
  profileHref?: string;
}) {
  const s = strings ?? DEFAULT_STRINGS;
  return (
    <>
      <header className="border-b border-rule bg-paper">
        <div className="shell flex h-16 items-center gap-2">
          <Link href="/" className="mr-auto rounded-[var(--radius-inner)] font-display text-[1.375rem] font-semibold text-ink">
            Confetti
          </Link>
          {isAdmin && (
            <Link href="/admin/users" className={barLink}>
              {s.admin}
            </Link>
          )}
          <Link href={profileHref} className={barLink}>
            {s.profile}
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={barLink}>
              {s.signOut}
            </button>
          </form>
        </div>
      </header>

      <div className="shell pb-[var(--space-lg)] pt-[var(--space-xl)]">
        {back ? (
          <nav aria-label="Breadcrumb" className="mb-[var(--space-sm)]">
            <Link href={back.href} className="link inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-2">
              <ArrowLeftIcon className="h-4 w-4" />
              {back.label}
            </Link>
          </nav>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="app-title text-ink">{title}</h1>
            {context ? <p className="meta mt-1">{context}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </>
  );
}
