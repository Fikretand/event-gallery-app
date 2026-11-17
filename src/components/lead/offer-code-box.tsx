"use client";

import { useActionState } from "react";

import type { Dict, Locale } from "@/lib/i18n/index";
import { applyOfferCodeAction, removeOfferCodeAction, type CodeState } from "@/lib/lead-actions";

/**
 * "Have a discount code?" on the One Event card. A code that works is shown
 * as applied (the price above it already changed); one that does not says why.
 */
export function OfferCodeBox({
  locale,
  strings: s,
  applied,
  storedError,
}: {
  locale: Locale;
  strings: Dict["leadOffer"];
  applied: string | null;
  storedError: CodeState["error"] | null;
}) {
  const [state, action, pending] = useActionState(applyOfferCodeAction.bind(null, locale), {} as CodeState);
  const remove = removeOfferCodeAction.bind(null, locale);
  const error = state.error ?? storedError;
  const message = error
    ? { invalid: s.codeInvalid, expired: s.codeExpired, redeemed: s.codeRedeemed, unavailable: s.codeUnavailable }[error]
    : null;

  if (applied) {
    return (
      <div className="mt-[var(--space-md)] flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-inner)] bg-moss-soft px-4 py-3">
        <p role="status" className="text-sm font-medium text-moss">
          {applied}
        </p>
        <form action={remove}>
          <button type="submit" className="btn btn-sm btn-quiet">
            {s.codeRemove}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-[var(--space-md)]">
      <form action={action} className="flex flex-col gap-2">
        <label htmlFor="offer-code" className="field-label">
          {s.codeLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="offer-code"
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            placeholder={s.codePlaceholder}
            aria-invalid={Boolean(message)}
            className="field code min-w-0 flex-1"
          />
          <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-secondary shrink-0">
            {s.codeApply}
          </button>
        </div>
      </form>
      {message ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm font-medium text-error">
            {message}
          </p>
          {storedError && !state.error ? (
            <form action={remove}>
              <button type="submit" className="btn btn-sm btn-quiet">
                {s.codeRemove}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
