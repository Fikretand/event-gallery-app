# Polar setup (production)

**This runs against the live Polar production environment.** Real cards are
charged. Never paste a token or webhook secret into a chat, a commit or this
file — they live only in Vercel.

## Organization
- Polar org: `confetti-ba` (`66327521-47b8-4fdf-81ba-7fa162a9f3d5`)
- Dashboard: https://polar.sh/dashboard/confetti-ba
- Status: **approved and live** since 2026-10-15 (checkout, renewals,
  payouts, refunds enabled). Support email: `podrska@confetti.ba`.
- End-to-end test passed 2026-10-15: One Event bought with a single-use 100%
  code → order `15d0dc4a-…` paid → webhook activated the account
  (`subscription_status = 'active'`, `subscription_provider = 'polar'`).

## Code (already in place, unchanged)
| What | Where |
|---|---|
| Checkout | `POST /api/billing/checkout` → `createPolarCheckout` in `src/lib/billing.ts` (sends `externalCustomerId` + `metadata.userId`) |
| Webhook | `POST /api/billing/polar/webhook` — Standard Webhooks verification done by hand (the SDK's `validateEvent` alone rejects Polar's deliveries, see CLAUDE.md §3) |
| SDK client | `polarClient()` in `src/lib/billing.ts`, server from `POLAR_SERVER` |
| Customer portal | Hosted by Polar; customers get the link by email. No app code. |

## Environment variables (Vercel, Production)
Names only — values are in Vercel.

| Key | Kind |
|---|---|
| `POLAR_ACCESS_TOKEN` | secret (organization token: products, checkouts, webhooks) |
| `POLAR_WEBHOOK_SECRET` | secret (signing secret of the endpoint below) |
| `POLAR_SERVER` | `production` |
| `POLAR_PRODUCT_ONE_EVENT` | `18348a4c-3bec-4da7-8792-4b7dcbdf4f42` — 79 KM one-time |
| `POLAR_PRODUCT_SOLO_MONTHLY` | `bc3a2ccd-d79c-4b99-ad2b-55ff0605df87` — 49 KM / month |
| `POLAR_PRODUCT_SOLO_YEARLY` | `42e67442-bcad-4a7e-bf32-b4dc1e796949` — 468 KM / year |
| `POLAR_PRODUCT_PRO_MONTHLY` | `cc13cee5-6fce-42ba-a147-8caceda3474e` — 99 KM / month |
| `POLAR_PRODUCT_PRO_YEARLY` | `e07a3904-a9c4-4ca5-a29f-8b5cc9cdde8f` — 948 KM / year |

Prices must match `src/lib/pricing.ts`. Changing a price means editing that
file **and** the product in Polar.

## Webhook endpoint
- URL: `https://www.confetti.ba/api/billing/polar/webhook` (the www host
  exactly — webhooks do not follow redirects)
- Format: Raw
- Events: `order.created`, `order.paid`, `order.refunded`,
  `subscription.created`, `subscription.active`, `subscription.updated`,
  `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`,
  `subscription.past_due`

## Test before announcing (no real charge)
1. Polar has approved the org (`checkout_payments: true`).
2. Create a one-use 100% discount code in Polar.
3. Sign up a fresh couple test account on confetti.ba, buy One Event, enter
   the code on Polar's checkout page.
4. A 100% order arrives as `order.created` only — the webhook handles it.
   Check: Vercel logs show 200 on `/api/billing/polar/webhook`; the account's
   `users` row has `subscription_status = 'active'`, `provider = 'polar'`; the
   dashboard shows the paid plan.
5. Archive the discount; delete the test account from the admin panel.
6. Confirm payouts reach the BiH bank account before relying on revenue.

## Going back to sandbox
Switch **every** `POLAR_*` variable together (server, token, webhook secret,
five product ids). A mix of sandbox and production values fails every
checkout.
