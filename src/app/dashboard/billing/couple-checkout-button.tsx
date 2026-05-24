"use client";

import { useState, useTransition } from "react";

export function CoupleCheckoutButton({ paymentsEnabled }: { paymentsEnabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function checkout() {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "couple" }),
        });
        if (res.ok) {
          const { url } = await res.json();
          if (url) {
            window.location.href = url;
            return;
          }
        }
        if (res.status === 503) {
          setNotice(
            "Online checkout is being set up. Contact us to activate your plan — we'll switch it on for your account.",
          );
        } else {
          const data = await res.json().catch(() => ({}));
          setNotice(data.error ?? "Something went wrong. Please try again.");
        }
      } catch {
        setNotice("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="mt-5">
      {notice && (
        <div className="mb-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-4 py-3 text-sm text-[var(--color-ink)]">
          {notice}
        </div>
      )}
      <button
        onClick={checkout}
        disabled={pending || !paymentsEnabled}
        className="w-full rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Starting…" : "Buy One Event · €39"}
      </button>
      {!paymentsEnabled && (
        <p className="mt-2 text-center text-xs text-black/45">
          Online checkout is being set up — coming soon.
        </p>
      )}
    </div>
  );
}
