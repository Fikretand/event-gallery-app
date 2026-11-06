"use client";

import { loadWhop } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements } from "@whop/elements-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** What `POST /api/billing/checkout` returns for a Whop plan. */
export type WhopCheckoutSession = {
  /** The `ch_…` checkout configuration, created on our server with the buyer's account id in its metadata. */
  checkoutConfiguration: string;
  /** Whop's hosted page for the same configuration: the fallback when the element cannot load. */
  url: string;
  environment: "production" | "sandbox";
};

export type CheckoutDialogStrings = {
  title: string;
  close: string;
};

/**
 * Whop styles its elements from a fixed palette, so these are the nearest
 * names to the Confetti accent and paper — not our tokens, which cannot reach
 * into the element's frame.
 */
const APPEARANCE = {
  theme: { appearance: "light", accentColor: "tomato", grayColor: "sand" },
  variables: { "--radius": "10px" },
} as const;

/** If the checkout has not appeared by then, hand the buyer to the hosted page instead. */
const LOAD_TIMEOUT_MS = 15_000;

/**
 * Whop's checkout, embedded in a dialog over the billing page, so the buyer
 * pays without leaving confetti.ba. Full screen on a phone, a centred panel
 * from `md` up.
 *
 * Activation does not depend on anything here: the webhook activates the
 * account from the checkout configuration's metadata, exactly as with the
 * hosted page. This only decides where the buyer goes next — the dashboard's
 * "activating" banner after an in-page payment, or back to the billing page
 * (`?checkout=1`, with Whop's `status`) after an off-site step such as 3D
 * Secure. If the element cannot load at all, the buyer is sent to Whop's
 * hosted page, so a blocked script never blocks a purchase.
 */
export function WhopCheckoutDialog({
  session,
  buyerEmail,
  strings,
  onClose,
}: {
  session: WhopCheckoutSession;
  buyerEmail?: string;
  strings: CheckoutDialogStrings;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const readyRef = useRef(false);
  const [load] = useState(() => loadWhop());

  // This component only mounts after a click, so `window` is always there.
  const { returnUrl, paidUrl } = useMemo(() => {
    const { origin, pathname } = window.location;
    return {
      returnUrl: `${origin}${pathname}?checkout=1`,
      // /bs/dashboard/billing → /bs/dashboard?paid=1; couples are forwarded on from there.
      paidUrl: `${pathname.replace(/\/billing\/?$/, "")}?paid=1`,
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const fallBack = () => {
      if (!readyRef.current) window.location.assign(session.url);
    };
    load.catch(fallBack);
    const timer = window.setTimeout(fallBack, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [load, session.url]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={strings.title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-card p-0 text-ink backdrop:bg-ink/40 md:m-auto md:h-auto md:max-h-[90dvh] md:w-[min(560px,calc(100%-2rem))] md:rounded-[var(--radius-card)] md:shadow-[var(--shadow-card)]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rule bg-card px-5 py-3">
        <p className="font-semibold text-ink">{strings.title}</p>
        <button type="button" onClick={onClose} className="btn btn-quiet btn-sm">
          {strings.close}
        </button>
      </div>
      <div className="p-5">
        <WhopElements elements={load} environment={session.environment} appearance={APPEARANCE} locale="en">
          <Checkout
            checkoutConfiguration={session.checkoutConfiguration}
            returnUrl={returnUrl}
            onComplete={(completion) => {
              if (completion.result === "payment") window.location.assign(paidUrl);
            }}
            // On the handle rather than the element: it holds until the whole
            // checkout has loaded, where the element's own showed blank paper.
            fallback={
              <div className="flex min-h-64 items-center justify-center" role="status" aria-label={strings.title}>
                <span
                  aria-hidden
                  className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent"
                />
              </div>
            }
          >
            <CheckoutElement
              buyerEmail={buyerEmail}
              onReady={() => {
                readyRef.current = true;
              }}
              onError={(error) => console.error("[whop-checkout] element error", error)}
            />
          </Checkout>
        </WhopElements>
      </div>
    </dialog>
  );
}
