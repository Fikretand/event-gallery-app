"use client";

import Script from "next/script";
import { useCallback } from "react";

type PayhipCheckout = {
  open: (opts: {
    product: string;
    message?: string;
    successUrl?: string;
    successCallback?: () => void;
  }) => void;
};

declare global {
  interface Window {
    Payhip?: { Checkout?: PayhipCheckout };
  }
}

/**
 * Payhip overlay checkout button for the One Event couple plan.
 *
 * Uses Payhip's programmatic API — `window.Payhip.Checkout.open({ product })` —
 * so the checkout opens in a popup overlay on click. This is more reliable in a
 * Next.js SPA than the auto-bound `.payhip-buy-button` markup, which depends on
 * the SDK scanning the DOM at load time (and fails after client-side nav).
 *
 * `productKey` and `userEmail` come from the server so no env var hits the
 * client bundle. If the SDK hasn't loaded yet, we fall back to the hosted
 * checkout URL (which supports `?email=` prefill).
 *
 * NOTE: Payhip's overlay has no email-prefill option and webhooks carry no
 * custom metadata, so the buyer MUST use their account email at checkout for
 * automatic activation — hence the hint shown below the button.
 */
export function CoupleCheckoutButton({
  productKey,
  userEmail,
  paymentsEnabled,
}: {
  productKey: string;
  userEmail: string;
  paymentsEnabled: boolean;
}) {
  const canCheckout = paymentsEnabled && Boolean(productKey);

  const openCheckout = useCallback(() => {
    const checkout = window.Payhip?.Checkout;
    if (checkout) {
      checkout.open({
        product: productKey,
        successUrl: `${window.location.origin}/dashboard/billing?success=1`,
      });
    } else {
      // SDK not ready — fall back to the hosted checkout (email prefilled here).
      window.location.href = `https://payhip.com/b/${productKey}?email=${encodeURIComponent(userEmail)}`;
    }
  }, [productKey, userEmail]);

  if (!canCheckout) {
    return (
      <div className="mt-5">
        <button
          disabled
          className="w-full cursor-not-allowed rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white opacity-60"
        >
          Buy One Event · €39
        </button>
        <p className="mt-2 text-center text-xs text-black/45">
          Online checkout is being set up — coming soon.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://payhip.com/payhip.js" strategy="afterInteractive" />
      <div className="mt-5">
        <button
          onClick={openCheckout}
          className="w-full rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Buy One Event · €39
        </button>
        <p className="mt-2 text-center text-xs text-black/45">
          Secure payment via Payhip — opens right here, no redirect.
        </p>
        {userEmail && (
          <p className="mt-1 text-center text-xs text-black/45">
            Use <span className="font-semibold">{userEmail}</span> at checkout so we
            can activate your plan automatically.
          </p>
        )}
      </div>
    </>
  );
}
