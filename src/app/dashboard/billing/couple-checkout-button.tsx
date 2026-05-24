"use client";

import Script from "next/script";

/**
 * Payhip overlay checkout button for the One Event couple plan.
 *
 * Payhip's `payhip.js` intercepts clicks on `.payhip-buy-btn` elements and
 * opens their checkout in a popup modal — the user never leaves the page.
 *
 * `productKey` and `userEmail` are passed as server-side props so we never
 * expose env vars on the client bundle.
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

  return (
    <>
      {canCheckout && (
        <Script
          src="https://payhip.com/payhip.js"
          strategy="afterInteractive"
        />
      )}

      <div className="mt-5">
        {canCheckout ? (
          <>
            <a
              href={`https://payhip.com/b/${productKey}`}
              data-payhip-product-id={productKey}
              data-payhip-email={userEmail}
              className="payhip-buy-btn block w-full rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:brightness-105"
            >
              Buy One Event · €39
            </a>
            <p className="mt-2 text-center text-xs text-black/45">
              Secure payment via Payhip · After purchase, refresh to activate.
            </p>
          </>
        ) : (
          <>
            <button
              disabled
              className="w-full cursor-not-allowed rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white opacity-60"
            >
              Buy One Event · €39
            </button>
            <p className="mt-2 text-center text-xs text-black/45">
              Online checkout is being set up — coming soon.
            </p>
          </>
        )}
      </div>
    </>
  );
}
