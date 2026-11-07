"use client";

import { useActionState, useRef, useState } from "react";

import { ArrowLeftIcon } from "@/components/ui/icons";
import { normalizeAccountType } from "@/lib/account";
import type { Dict, Locale } from "@/lib/i18n/index";
import type { AccountType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Strings = Dict["dashboard"]["create"];

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** "14. 6. 2027." in Bosnian (the brand's date style), "14 June 2027" in English. */
function shortDate(isoDay: string, locale: Locale) {
  const [y, m, d] = isoDay.split("-").map(Number);
  if (!y || !m || !d) return isoDay;
  if (locale === "bs") return `${d}. ${m}. ${y}.`;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

type Step = "title" | "client" | "date" | "review";
const STEPS: Step[] = ["title", "client", "date", "review"];

/**
 * Creating an event, one question per screen: the name, whose day it is, the
 * date, then a short review. Nothing scrolls. Everything else (PINs, guest
 * video, upload rules) starts from safe defaults and lives in the event's
 * settings, which the review step says.
 *
 * All four screens sit in one <form>, so the fields keep their values when
 * the guest goes back, and the server action receives the same names as
 * before (title, clientName, eventDate and the defaults as hidden fields).
 */
export function EventCreateWizard({
  action,
  intent = "photographer",
  locale,
  strings,
}: {
  action: (state: { error?: string } | undefined | void, formData: FormData) => Promise<{ error?: string } | void>;
  intent?: AccountType;
  locale: Locale;
  strings: Strings;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isCouple = normalizeAccountType(intent) === "couple";
  const f = strings.form;
  const w = strings.wizard;

  const [index, setIndex] = useState(0);
  const [values, setValues] = useState({ title: "", clientName: "", eventDate: "" });
  const [problem, setProblem] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const step = STEPS[index];

  function validate(current: Step): string | null {
    if (current === "title" && !values.title.trim()) return w.titleRequired;
    if (current === "date" && isCouple && !values.eventDate) return w.dateRequired;
    return null;
  }

  function next() {
    const message = validate(step);
    setProblem(message);
    if (message) return;
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setProblem(null);
    setIndex((i) => Math.max(i - 1, 0));
  }

  // Enter moves to the next question instead of submitting half a form.
  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && step !== "review" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      next();
    }
  }

  const question = "font-display text-[clamp(1.75rem,3vw+1rem,2.5rem)] font-semibold leading-tight tracking-[-0.02em] text-ink";
  const bigField = "field min-h-14 text-lg";

  return (
    <form
      ref={formRef}
      action={formAction}
      onKeyDown={onKeyDown}
      aria-label={isCouple ? f.headingCouple : f.headingPhotographer}
      className="mx-auto max-w-xl"
    >
      {/* What happens on creation, without asking: the old form's defaults. */}
      <input type="hidden" name="allowGuestUpload" value="on" />
      <input type="hidden" name="allowGuestVideo" value="on" />
      <input type="hidden" name="requirePinForGallery" value="on" />

      <div className="flex items-center justify-between gap-4">
        <p className="meta num" aria-live="polite">
          {fill(w.stepOf, { n: index + 1, total: STEPS.length })}
        </p>
        <ol className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("h-1.5 w-8 rounded-full", i <= index ? "bg-accent" : "bg-paper-3")} />
          ))}
        </ol>
      </div>

      <div className="mt-[var(--space-xl)] min-h-[16rem]">
        {/* Every screen stays mounted (hidden when not current) so the form posts all fields. */}
        <section hidden={step !== "title"} aria-labelledby="q-title">
          <label id="q-title" htmlFor="wizard-title" className={cn(question, "block")}>
            {isCouple ? w.titleQuestionCouple : w.titleQuestionPhotographer}
          </label>
          <p className="mt-2 text-ink-2">{w.titleHelp}</p>
          <input
            id="wizard-title"
            name="title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder={isCouple ? f.titlePlaceholderCouple : f.titlePlaceholderPhotographer}
            autoComplete="off"
            className={cn(bigField, "mt-[var(--space-lg)]")}
            autoFocus
          />
        </section>

        <section hidden={step !== "client"} aria-labelledby="q-client">
          <label id="q-client" htmlFor="wizard-client" className={cn(question, "block")}>
            {isCouple ? w.clientQuestionCouple : w.clientQuestionPhotographer}
          </label>
          <p className="mt-2 text-ink-2">{w.clientHelp}</p>
          <input
            id="wizard-client"
            name="clientName"
            value={values.clientName}
            onChange={(e) => setValues((v) => ({ ...v, clientName: e.target.value }))}
            placeholder={isCouple ? f.clientNamePlaceholderCouple : f.clientNamePlaceholderPhotographer}
            autoComplete="off"
            autoCapitalize="words"
            className={cn(bigField, "mt-[var(--space-lg)]")}
          />
        </section>

        <section hidden={step !== "date"} aria-labelledby="q-date">
          <label id="q-date" htmlFor="wizard-date" className={cn(question, "block")}>
            {w.dateQuestion}
          </label>
          <p className="mt-2 text-ink-2">{isCouple ? f.eventDateHintCouple : w.dateHelpPhotographer}</p>
          <input
            id="wizard-date"
            name="eventDate"
            type="date"
            value={values.eventDate}
            onChange={(e) => setValues((v) => ({ ...v, eventDate: e.target.value }))}
            className={cn(bigField, "mt-[var(--space-lg)]")}
          />
          {isCouple ? (
            <div className="notice notice-info mt-[var(--space-lg)]">
              {f.couplePlanNote}
              <p className="mt-1">{f.couplePlanNoteSub}</p>
            </div>
          ) : null}
        </section>

        <section hidden={step !== "review"} aria-labelledby="q-review">
          <h2 id="q-review" className={question}>
            {w.reviewTitle}
          </h2>
          <dl className="mt-[var(--space-lg)] border-t border-rule">
            {[
              { label: f.titleLabel, value: values.title, step: 0 },
              { label: isCouple ? f.clientNameLabelCouple : f.clientNameLabelPhotographer, value: values.clientName, step: 1 },
              { label: f.eventDateLabel, value: values.eventDate ? shortDate(values.eventDate, locale) : "", step: 2 },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-rule py-3">
                <dt className="text-sm text-ink-2">{row.label}</dt>
                <dd className="flex items-baseline gap-3 text-right">
                  <span className={row.value ? "font-semibold text-ink" : "text-muted"}>{row.value || w.reviewEmpty}</span>
                  <button type="button" onClick={() => setIndex(row.step)} className="link text-sm">
                    <span className="sr-only">{row.label}: </span>
                    {w.change}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
          <p className="notice notice-info mt-[var(--space-lg)]">{w.settingsNote}</p>
        </section>
      </div>

      {problem ? (
        <p role="alert" className="notice notice-error mt-[var(--space-md)]">
          {problem}
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="notice notice-error mt-[var(--space-md)]">
          {state.error}
        </p>
      ) : null}

      <div className="mt-[var(--space-xl)] flex items-center justify-between gap-3 border-t border-rule pt-[var(--space-lg)]">
        {index > 0 ? (
          <button type="button" onClick={back} className="btn btn-quiet">
            <ArrowLeftIcon className="h-4 w-4" />
            {w.back}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {step === "client" || (step === "date" && !isCouple) ? (
            <button type="button" onClick={() => setIndex((i) => i + 1)} className="btn btn-quiet">
              {w.skip}
            </button>
          ) : null}
          {step === "review" ? (
            // Distinct keys: the "Dalje" button must not become this submit
            // button under the same click, or that click would submit.
            <button key="submit" type="submit" disabled={isPending} aria-busy={isPending} className="btn btn-primary min-w-40">
              {isPending ? f.submitting : isCouple ? f.submitCouple : f.submitPhotographer}
            </button>
          ) : (
            <button key="next" type="button" onClick={next} className="btn btn-primary min-w-32">
              {w.next}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
