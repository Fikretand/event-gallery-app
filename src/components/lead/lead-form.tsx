"use client";

import Link from "next/link";
import { useActionState, useEffect, useId } from "react";

import { track } from "@/lib/analytics";
import type { Dict, Locale } from "@/lib/i18n/index";
import { captureLeadAction, type CaptureState } from "@/lib/lead-actions";

/** The one form on /popust: an email, a consent box, and nothing else to fill in. */
export function LeadForm({
  locale,
  strings: s,
  utm,
  privacyHref,
}: {
  locale: Locale;
  strings: Dict["leadOffer"];
  utm: Record<"utm_source" | "utm_medium" | "utm_campaign", string>;
  privacyHref: string;
}) {
  const [state, action, pending] = useActionState(captureLeadAction.bind(null, locale), { status: "idle" } as CaptureState);
  const id = useId();

  useEffect(() => {
    if (state.status === "sent") track("generate_lead", { source: utm.utm_source || "direct" });
  }, [state.status, utm.utm_source]);

  if (state.status === "sent" || state.status === "existing") {
    return (
      <div role="status" className="card mt-[var(--space-xl)] max-w-xl p-[var(--space-lg)]">
        <p className="title text-ink">{s.successTitle}</p>
        <p className="mt-2 text-ink-2">{(state.status === "sent" ? s.successBody : s.existingBody).replace("{{email}}", state.email)}</p>
      </div>
    );
  }
  if (state.status === "closed") {
    return (
      <p role="status" className="notice notice-warning mt-[var(--space-xl)] max-w-xl">
        {s.closedTitle}
      </p>
    );
  }

  const error =
    state.status === "error"
      ? { email: s.errorEmail, consent: s.errorConsent, rate: s.errorRate, generic: s.errorGeneric }[state.error]
      : null;

  return (
    <form action={action} className="mt-[var(--space-xl)] max-w-xl space-y-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-email`} className="field-label">
          {s.emailLabel}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder={s.emailPlaceholder}
            aria-invalid={state.status === "error" && state.error === "email"}
            className="field min-w-0 flex-1"
          />
          <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary shrink-0">
            {pending ? s.submitting : s.submit}
          </button>
        </div>
      </div>
      <label className="check-row items-start">
        <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0" />
        <span className="text-sm text-ink-2">{s.consent}</span>
      </label>
      <input type="hidden" name="consentText" value={s.consent} />
      {Object.entries(utm).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
      {/* Left empty by people, filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
      <p className="meta">
        {s.note}{" "}
        <Link href={privacyHref} className="underline underline-offset-2">
          {s.privacyLink}
        </Link>
      </p>
    </form>
  );
}
