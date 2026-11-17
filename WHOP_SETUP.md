# Whop setup

Whop replaced Polar in November 2026. Never paste an API key
or webhook secret into a chat, a commit or this file. They live only in Vercel
and in your local `.env.local`.

## Account
- Business: `biz_1nkrffanR1jzik`
- Dashboard: https://whop.com/dashboard/biz_1nkrffanR1jzik/
- Sandbox: https://sandbox.whop.com (separate account and keys, cards only)

## Code
| What | Where |
|---|---|
| Checkout | `POST /api/billing/checkout` → `createWhopCheckout` in `src/lib/billing.ts`. It creates a checkout configuration with `variant_id` = the plan, `metadata.userId` and `redirect_url`, and returns its `purchase_url`. It returns the configuration id too. |
| Embedded checkout | `WhopCheckoutDialog` (`src/components/whop-checkout-dialog.tsx`) mounts Whop's Checkout element (`@whop/elements-react`) from that `ch_…` id in a dialog on the billing page: full screen on a phone, a panel from `md`. Payment in the element → `/dashboard?paid=1`; an off-site step (3D Secure) returns to `/dashboard/billing?checkout=1&status=…`. If the element does not load in 15 s, the browser goes to `purchase_url`. |
| Webhook | `POST /api/billing/whop/webhook`. Standard Webhooks, HMAC keyed on the literal `ws_…` secret (`verifyWhopSignature`). |
| Catalogue script | `node scripts/whop-setup.mjs --env sandbox [--webhook-url …]` writes sandbox ids into `.env.local`; `--env production` (key in `WHOP_PRODUCTION_API_KEY`) only prints the ids for Vercel. |
| Customer portal | Hosted by Whop (whop.com/@me). No app code. |

Whop copies checkout `metadata` onto the payment and the membership, so every
event (first payment, renewal, cancel, refund) names the account that started
the purchase. Each purchase is stored by its membership id (`mem_…`) in
`users.subscription_external_id`.

## Webhook events
- `payment.succeeded`: first purchase or renewal paid → `active`
- `membership.activated`, `membership.updated`, `membership.deactivated`,
  `membership.cancel_at_period_end_changed`: subscription lifecycle and the
  renewal date. One Event memberships ignore everything except activation.
- `refund.created`, `refund.updated`: once `succeeded`, the payment is read
  back from the API and its purchase is set to `canceled`. Partial refunds
  leave the account alone.

The endpoint is pinned to `api_version_date = 2026-08-14`
(`WHOP_API_VERSION_DATE` in `billing.ts`, and the same pin in the script).

URL in production: `https://www.confetti.ba/api/billing/whop/webhook`. Use the
www host exactly, because Whop does not follow redirects.

## Environment variables (Vercel)
Names only.

| Key | Kind |
|---|---|
| `WHOP_API_KEY` | secret (company API key) |
| `WHOP_WEBHOOK_SECRET` | secret (`ws_…`, shown once when the webhook is created) |
| `WHOP_ACCOUNT_ID` | `biz_…` |
| `WHOP_ENVIRONMENT` | `production` (or `sandbox`) |
| `WHOP_PLAN_ONE_EVENT` | `plan_…`, 79 KM one-time |
| `WHOP_PLAN_SOLO_MONTHLY` | `plan_…`, 49 KM / 30 days |
| `WHOP_PLAN_SOLO_YEARLY` | `plan_…`, 468 KM / 365 days |
| `WHOP_PLAN_PRO_MONTHLY` | `plan_…`, 99 KM / 30 days |
| `WHOP_PLAN_PRO_YEARLY` | `plan_…`, 948 KM / 365 days |
| `WHOP_PLAN_ONE_EVENT_OFFER` | `plan_…`, 69 KM one-time, hidden (lead discount code) |
| `WHOP_PLAN_ONE_EVENT_OFFER_FINAL` | `plan_…`, 64 KM one-time, hidden (code's last days) |

Switch every `WHOP_*` variable together. A mix of sandbox and production
values fails every checkout.

Polar was removed entirely when Whop went in: it never had a real customer
(only 0 KM test orders in production and a sandbox test subscription). The
`POLAR_*` variables can be deleted from Vercel, and the Polar webhook endpoint
in the Polar dashboard can be disabled.

## Lead offer plans (discount codes from /popust)

A code from the lead emails (src/lib/leads.ts) buys One Event through one of
two extra plans: 69 KM, and 64 KM in the code's last days. They are ordinary
one-time plans on the One Event product, set to **Hidden** so the storefront
never shows them; only a checkout our server creates for a valid code uses
them. `scripts/whop-setup.mjs` creates both (it reuses plans that exist by
title). By hand: Whop dashboard → the One Event product → Add plan → One-time,
69.00 BAM, visibility Hidden; again for 64.00 BAM. Put the two `plan_…` ids in
Vercel as `WHOP_PLAN_ONE_EVENT_OFFER` and `WHOP_PLAN_ONE_EVENT_OFFER_FINAL`
and redeploy. Until both are set, /admin/leads warns and the billing page says
the discount cannot be applied (nobody is charged a price they were not shown).
The prices live in `src/lib/pricing.ts`; change both together.

## Apple Pay and Google Pay
The embedded checkout shows both wallets only once Apple Pay is ready on
`www.confetti.ba` (one verification clears both). Whop registered the domain
by itself the first time the element loaded (`dom_KKYWWWETyWX0l5`), but
Apple could not verify it: the middleware redirected the association file to
`/bs/…`. Now `next.config.ts` rewrites
`/.well-known/apple-developer-merchantid-domain-association` to the file Whop
hosts, and the middleware skips `/.well-known/`. After a deploy, re-run the
check: dashboard → Websites → the domain → Fix Apple Pay → Check now (or
`POST /payment_method_domains/{id}/verify`).

## Shapes: webhook vs REST
Whop sends the same object in two shapes. Webhook payloads carry flat ids
(`variant_id`, `membership_id`, `payment_id`); the REST API, even pinned to the
same date, nests them (`plan: { id }`, `membership: { id }`, `plan_id`,
`payment: { id }`). The webhook reads both. Found in the sandbox test on
2026-11-05, where a refund was silently skipped until PR #2.

## Sandbox test, 2026-11-05 (passed)
On www.confetti.ba with `WHOP_ENVIRONMENT=sandbox`: purchase → `active`;
partial refund (70 of 79 KM) → unchanged; refund of the rest → `canceled`; a
second purchase on another couple account → `active`. Sandbox business
`Confetti_test` (`biz_YzT3bWdBAYSq3Y`). Sandbox API keys lack
`developer:manage_webhook`, so the webhook was created in the dashboard.

## Test before announcing
1. Sandbox: run the script with `--env sandbox` and a public webhook URL (a
   tunnel or a preview deployment), then buy with card `4242 4242 4242 4242`.
2. Check that the webhook answered 200 (Whop dashboard → Developer →
   deliveries) and that the account's `users` row has
   `subscription_status = 'active'` and `subscription_provider = 'whop'`.
3. Refund the sandbox payment and check that the row turns `canceled`.
4. Production: create the same catalogue, set the Vercel variables, buy One
   Event with a 100% promo code on a fresh couple test account, then delete
   that account from the admin panel.
