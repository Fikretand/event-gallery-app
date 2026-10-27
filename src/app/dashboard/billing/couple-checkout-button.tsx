"use client";

import Script from "next/script";
import { useCallback, useState } from "react";

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

export type CoupleCheckoutStrings = {
  buyOneEvent: string;
  checkoutOpening: string;
  checkoutSecure: string;
  checkoutEmailHint: string;
  checkoutError: string;
  checkoutComingSoon: string;
};

const FALLBACK: CoupleCheckoutStrings = {
  buyOneEvent: "Buy One Event, {{price}}",
  checkoutOpening: "Opening checkout…",
  checkoutSecure: "Secure payment — card or bank, invoice sent by email.",
  checkoutEmailHint: "Use {{email}} at checkout so we can activate your plan automatically.",
  checkoutError: "We couldn't open the checkout. Please try again in a moment.",
  checkoutComingSoon: "Online checkout is being set up — coming soon.",
};

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * Checkout button for the One Event couple plan.
 *
 * Two providers, chosen server-side:
 *
 * - **Polar** (preferred): POST to `/api/billing/checkout`, which creates a
 *   Polar checkout carrying the buyer's account id, then redirect to the
 *   returned hosted URL. Because the account id rides along in the checkout
 *   metadata, the webhook activates the right account no matter which email
 *   the buyer pays with — so no email hint is needed.
 * - **Payhip** (legacy): `window.Payhip.Checkout.open({ product })` opens the
 *   overlay in place. Payhip's overlay has no email-prefill option and its
 *   webhooks carry no custom metadata, so the buyer MUST use their account
 *   email for automatic activation — hence the hint under the button.
 *
 * `productKey` and `userEmail` come from the server so no env var reaches the
 * client bundle.
 */
export function CoupleCheckoutButton({
  provider,
  productKey,
  userEmail,
  paymentsEnabled,
  priceLabel,
  strings = FALLBACK,
}: {
  provider: "polar" | "payhip";
  productKey: string;
  userEmail: string;
  paymentsEnabled: boolean;
  priceLabel: string;
  strings?: CoupleCheckoutStrings;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPolar = provider === "polar";
  const canCheckout = paymentsEnabled && (isPolar || Boolean(productKey));
  const label = fill(strings.buyOneEvent, { price: priceLabel });

  const openPolarCheckout = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "couple", cycle: "one_time" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) throw new Error(json?.error ?? "checkout failed");
      window.location.href = json.url as string;
    } catch {
      setError(strings.checkoutError);
      setBusy(false);
    }
  }, [strings.checkoutError]);

  const openPayhipCheckout = useCallback(() => {
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
          className="btn btn-primary w-full"
        >
          {label}
        </button>
        <p className="meta mt-2">{strings.checkoutComingSoon}</p>
      </div>
    );
  }

  return (
    <>
      {!isPolar && <Script src="https://payhip.com/payhip.js" strategy="afterInteractive" />}
      <div className="mt-5">
        <button
          onClick={isPolar ? openPolarCheckout : openPayhipCheckout}
          disabled={busy}
          className="btn btn-primary w-full"
        >
          {busy ? strings.checkoutOpening : label}
        </button>
        <p className="meta mt-2">{strings.checkoutSecure}</p>
        {!isPolar && userEmail && (
          <p className="meta mt-1">
            {fill(strings.checkoutEmailHint, { email: userEmail })}
          </p>
        )}
        {error && <p role="alert" className="mt-2 text-sm font-medium text-error">{error}</p>}
      </div>
    </>
  );
}
