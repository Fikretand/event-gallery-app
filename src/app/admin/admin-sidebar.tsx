"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function IconDashboard() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7.5" cy="6" r="3" />
      <path d="M1.5 17c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M13.5 4.5c1.7 0 3 1.3 3 3s-1.3 3-3 3" strokeLinecap="round" />
      <path d="M17.5 17c0-2.8-1.8-5.1-4.5-5.7" strokeLinecap="round" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4L6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/admin/users", label: "Users", icon: <IconUsers /> },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
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
              onClick={onNavigate}
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
      <div className="border-t border-black/8 p-2.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-black/45 transition hover:bg-black/[0.05] hover:text-[var(--color-ink)]"
        >
          <IconArrowLeft />
          Back to dashboard
        </Link>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-semibold tracking-tight text-[var(--color-ink)]">Confetti</span>
      <span className="rounded-full bg-[var(--color-accent)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
        Admin
      </span>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-black/8 bg-white">
        <div className="border-b border-black/8 px-5 py-4">
          <Brand />
        </div>
        <NavLinks pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-black/8 bg-white px-4 py-3 lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-[var(--color-ink)]"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-black/8 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-black/40 hover:bg-black/5"
                aria-label="Close menu"
              >
                <IconClose />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
