"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconDashboard() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="6.5" r="3" />
      <path d="M2 16.5c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M14 4.5c1.7 0 3 1.3 3 3s-1.3 3-3 3" strokeLinecap="round" />
      <path d="M18 16.5c0-2.8-1.8-5.2-4.5-5.8" strokeLinecap="round" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4L6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/admin/users", label: "Users", icon: <IconUsers /> },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-black/8 bg-white">
      {/* Brand */}
      <div className="border-b border-black/8 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold tracking-tight text-[var(--color-ink)]">Confetti</span>
          <span className="rounded-full bg-[var(--color-accent)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
            Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2.5 pt-3">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-black/55 hover:bg-black/[0.05] hover:text-[var(--color-ink)]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-black/8 p-2.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-black/45 transition hover:bg-black/[0.05] hover:text-[var(--color-ink)]"
        >
          <IconArrowLeft />
          Back to dashboard
        </Link>
      </div>
    </aside>
  );
}
