"use client";

import { useState, useTransition } from "react";

import { deletePartnerOfferAction, setPartnerOfferActiveAction } from "@/lib/partner-actions";

export function PartnerRowActions({ offerId, active }: { offerId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => setPartnerOfferActiveAction(offerId, !active))} className="btn btn-sm btn-secondary">
        {active ? "Pause" : "Resume"}
      </button>
      {confirming ? (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => deletePartnerOfferAction(offerId))} className="btn btn-sm btn-danger">
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
      {error ? <span role="alert" className="text-sm text-error">{error}</span> : null}
    </div>
  );
}
