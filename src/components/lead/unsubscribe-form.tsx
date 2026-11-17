"use client";

import { useActionState } from "react";

import type { Dict } from "@/lib/i18n/index";
import { unsubscribeLeadAction, type UnsubscribeState } from "@/lib/lead-actions";

export function UnsubscribeForm({ token, strings: s }: { token: string; strings: Dict["leadOffer"] }) {
  const [state, action, pending] = useActionState(unsubscribeLeadAction, { status: "idle" } as UnsubscribeState);
  if (state.status === "done") return <p role="status" className="notice notice-success mt-[var(--space-lg)]">{s.unsubDone}</p>;
  if (state.status === "invalid" || !token) return <p role="alert" className="notice notice-error mt-[var(--space-lg)]">{s.unsubInvalid}</p>;
  return (
    <form action={action} className="mt-[var(--space-lg)] space-y-[var(--space-lg)]">
      <p className="lead">{s.unsubBody}</p>
      <input type="hidden" name="t" value={token} />
      <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary">
        {s.unsubButton}
      </button>
    </form>
  );
}
