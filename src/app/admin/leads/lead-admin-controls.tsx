"use client";

import { useActionState, useState, useTransition } from "react";

import { deleteLeadAction, resendLeadWelcomeAction, runLeadSequenceAction, saveLeadSettingsAction, type SettingsState } from "@/lib/lead-admin-actions";
import type { LeadSettings } from "@/lib/lead-sequence";

export function LeadSettingsForm({ settings }: { settings: LeadSettings }) {
  const [state, action, pending] = useActionState(saveLeadSettingsAction, {} as SettingsState);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="app-section-title text-ink">Offer settings</h2>
      <label className="check-row">
        <input type="checkbox" name="is_active" defaultChecked={settings.is_active} className="size-4" />
        Offer is running (off: /popust shows it closed)
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="field-label">Valid, days</span>
          <input name="valid_days" type="number" min={7} max={90} defaultValue={settings.valid_days} className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Reminder, day</span>
          <input name="reminder_day" type="number" min={1} defaultValue={settings.reminder_day} className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Last offer, days before end</span>
          <input name="final_days_before" type="number" min={1} defaultValue={settings.final_days_before} className="field" />
        </label>
      </div>
      <p className="meta">
        Applies to new leads only; everyone keeps the dates their emails promised. The two prices are fixed in pricing.ts and in their Whop plans.
      </p>
      <h3 className="text-base font-semibold text-ink">After the trial</h3>
      <label className="check-row">
        <input type="checkbox" name="trial_is_active" defaultChecked={settings.trial_is_active} className="size-4" />
        Email one-event accounts whose 7-day trial ended unpaid: One Event at the offer price
      </label>
      <label className="flex max-w-[12rem] flex-col gap-1">
        <span className="field-label">Valid, days</span>
        <input name="trial_valid_days" type="number" min={2} max={14} defaultValue={settings.trial_valid_days} className="field" />
      </label>
      <p className="meta">
        One email per account, sent on the daily run after the trial ends (trials that ended in the last 3 days). An address that already has a code is skipped.
      </p>
      {state.error ? <p role="alert" className="text-sm text-error">{state.error}</p> : null}
      {state.saved ? <p role="status" className="text-sm text-moss">Saved.</p> : null}
      <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function RunSequenceButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            try {
              const r = await runLeadSequenceAction();
              const sent = r.sent.welcome + r.sent.reminder + r.sent.final + r.sent.trial;
              setMessage(
                `${sent} sent, ${r.failed} failed, ${r.expired} expired, ${r.trialOffers} after-trial offers made${r.remaining ? `, ${r.remaining} left for the next run` : ""}.`,
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Something went wrong.");
            }
          })
        }
        className="btn btn-secondary"
      >
        {pending ? "Sending…" : "Send due emails now"}
      </button>
      {message ? <p role="status" className="meta">{message}</p> : <p className="meta">Runs by itself every day at 09:00.</p>}
    </div>
  );
}

export function LeadRowActions({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<void>, done: string) =>
    startTransition(async () => {
      setMessage(null);
      try {
        await fn();
        setMessage({ ok: true, text: done });
      } catch (e) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
      }
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => resendLeadWelcomeAction(leadId), "Sent.")} className="btn btn-sm btn-secondary">
        Send code again
      </button>
      {confirming ? (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => deleteLeadAction(leadId), "Deleted.")} className="btn btn-sm btn-danger">
            Delete for good
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn btn-sm btn-quiet">
            Cancel
          </button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => setConfirming(true)} className="btn btn-sm btn-danger-quiet">
          Delete
        </button>
      )}
      {message ? (
        <span role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-moss" : "text-error"}`}>
          {message.text}
        </span>
      ) : null}
    </div>
  );
}
