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
| Checkout | `POST /api/billing/checkout` → `createWhopCheckout` in `src/lib/billing.ts`. It creates a checkout configuration with `variant_id` = the plan, `metadata.userId` and `redirect_url`, and returns its `purchase_url`. |
| Webhook | `POST /api/billing/whop/webhook`. Standard Webhooks, HMAC keyed on the literal `ws_…` secret (`verifyWhopSignature`). |
| Catalogue script | `node scripts/whop-setup.mjs --env sandbox|production [--webhook-url …]` |
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

Switch every `WHOP_*` variable together. A mix of sandbox and production
values fails every checkout.

Polar was removed entirely when Whop went in: it never had a real customer
(only 0 KM test orders in production and a sandbox test subscription). The
`POLAR_*` variables can be deleted from Vercel, and the Polar webhook endpoint
in the Polar dashboard can be disabled.

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
