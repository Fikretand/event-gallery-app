"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type PaymentBannerStrings = {
  activatedTitle: string;
  activatedBody: string; // "{{plan}}"
  pendingTitle: string;
  pendingBody: string;
};

const FALLBACK: PaymentBannerStrings = {
  activatedTitle: "Payment received — you're all set.",
  activatedBody: "Your {{plan}} plan is active. Trial limits no longer apply.",
  pendingTitle: "Payment received — activating your plan.",
  pendingBody: "This usually takes a few seconds. The page refreshes on its own.",
};

/** How many times to re-check, and how long between checks. */
const REFRESH_ATTEMPTS = 6;
const REFRESH_INTERVAL_MS = 2500;

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * Shown when the buyer comes back from the payment provider.
 *
 * The provider redirects the browser back the moment the card clears, but the
 * account is activated by a webhook arriving separately — so the first render
 * after a successful payment often still shows the free trial. Rather than
 * claim an activation that has not happened, this asks the server again a few
 * times and only switches to the confirmed message once `activated` is true.
 */
export function PaymentSuccessBanner({
  activated,
  planLabel,
  strings = FALLBACK,
}: {
  activated: boolean;
  planLabel: string;
  strings?: PaymentBannerStrings;
}) {
  const router = useRouter();

  useEffect(() => {
    if (activated) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= REFRESH_ATTEMPTS) clearInterval(id);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activated, router]);

  if (activated) {
    return (
      <div className="rounded-2xl border border-[#bfe3c8] bg-[#eef9f0] px-4 py-3.5">
        <p className="text-sm font-semibold text-[#1f6b35]">{strings.activatedTitle}</p>
        <p className="mt-0.5 text-sm text-[#1f6b35]/80">
          {fill(strings.activatedBody, { plan: planLabel })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
        />
        {strings.pendingTitle}
      </p>
      <p className="mt-0.5 text-sm text-black/55">{strings.pendingBody}</p>
    </div>
  );
}
