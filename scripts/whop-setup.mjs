/**
 * Create the Confetti catalogue (3 products, 5 plans) and the billing webhook
 * on a Whop account, then write the resulting ids into .env.local.
 *
 *   node scripts/whop-setup.mjs --env sandbox --webhook-url https://<public host>/api/billing/whop/webhook
 *   node scripts/whop-setup.mjs --env sandbox            # catalogue only, no webhook
 *
 * Reads the API key from .env.local: WHOP_SANDBOX_API_KEY for --env sandbox,
 * WHOP_API_KEY for --env production. Safe to run again: products and plans
 * that already exist (matched by title) are reused, not duplicated.
 *
 * Secrets are never printed. The webhook signing secret is only shown by Whop
 * once, so it goes straight into .env.local as WHOP_WEBHOOK_SECRET.
 *
 * Prices must match src/lib/pricing.ts — BAM, tax inclusive, so the number on
 * the pricing page is the number on the checkout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const API_VERSION_DATE = "2026-08-14";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]?.startsWith("--") ? true : (all[i + 1] ?? true)]);
    return pairs;
  }, []),
);
const environment = args.env === "production" ? "production" : "sandbox";
if (args.env !== "sandbox" && args.env !== "production") {
  console.error("Pass --env sandbox or --env production.");
  process.exit(1);
}

process.loadEnvFile(ENV_FILE);
const apiKey = environment === "sandbox" ? process.env.WHOP_SANDBOX_API_KEY : process.env.WHOP_API_KEY;
if (!apiKey) {
  console.error(`Missing ${environment === "sandbox" ? "WHOP_SANDBOX_API_KEY" : "WHOP_API_KEY"} in .env.local.`);
  process.exit(1);
}
const BASE = environment === "sandbox" ? "https://sandbox-api.whop.com/api/v1" : "https://api.whop.com/api/v1";

async function whop(method, pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Api-Version-Date": API_VERSION_DATE,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

const CATALOGUE = [
  {
    title: "Confetti – One Event",
    description:
      "Privatna galerija za jedan događaj: gosti šalju fotografije i videe preko QR koda, vi ih odobravate i dijelite.",
    plans: [{ key: "WHOP_PLAN_ONE_EVENT", title: "Jedan događaj", billing_type: "one_time", price: 79 }],
  },
  {
    title: "Confetti Solo",
    description: "Za fotografe: do 5 aktivnih događaja i 100 GB prostora, prijenos gostiju preko QR koda.",
    plans: [
      { key: "WHOP_PLAN_SOLO_MONTHLY", title: "Solo mjesečno", billing_type: "renewal", period: 30, price: 49 },
      { key: "WHOP_PLAN_SOLO_YEARLY", title: "Solo godišnje", billing_type: "renewal", period: 365, price: 468 },
    ],
  },
  {
    title: "Confetti Pro",
    description: "Za fotografe: do 25 aktivnih događaja i 500 GB prostora, sve iz Solo plana.",
    plans: [
      { key: "WHOP_PLAN_PRO_MONTHLY", title: "Pro mjesečno", billing_type: "renewal", period: 30, price: 99 },
      { key: "WHOP_PLAN_PRO_YEARLY", title: "Pro godišnje", billing_type: "renewal", period: 365, price: 948 },
    ],
  },
];

const WEBHOOK_EVENTS = [
  "payment.succeeded",
  "membership.activated",
  "membership.deactivated",
  "membership.updated",
  "membership.cancel_at_period_end_changed",
  "refund.created",
  "refund.updated",
];

/** Set or replace KEY=value lines in .env.local without touching anything else. */
function writeEnv(values) {
  let text = fs.readFileSync(ENV_FILE, "utf8");
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
  }
  fs.writeFileSync(ENV_FILE, text);
}

const account = await whop("GET", "/accounts/me");
const accountId = account.id;
console.log(`Account: ${account.title ?? "?"} (${accountId}), ${environment}`);

const existingProducts = (await whop("GET", `/products?account_id=${accountId}&first=100`)).data ?? [];
const ids = { WHOP_ACCOUNT_ID: accountId, WHOP_ENVIRONMENT: environment };

for (const product of CATALOGUE) {
  let found = existingProducts.find((p) => p.title === product.title);
  if (!found) {
    found = await whop("POST", "/products", {
      account_id: accountId,
      title: product.title,
      description: product.description,
      send_welcome_message: false,
    });
    console.log(`  created product ${found.id}  ${product.title}`);
  } else {
    console.log(`  reusing product ${found.id}  ${product.title}`);
  }

  const existingPlans = (await whop("GET", `/plans?account_id=${accountId}&product_ids=${found.id}&first=100`)).data ?? [];
  for (const plan of product.plans) {
    let match = existingPlans.find((p) => p.title === plan.title);
    if (!match) {
      match = await whop("POST", "/plans", {
        account_id: accountId,
        product_id: found.id,
        title: plan.title,
        currency: "bam",
        billing_type: plan.billing_type,
        release_method: "buy_now",
        override_tax_type: "inclusive",
        ...(plan.billing_type === "one_time"
          ? { initial_price: plan.price }
          : { initial_price: 0, renewal_price: plan.price, billing_period: plan.period }),
      });
      console.log(`    created plan ${match.id}  ${plan.title}  ${plan.price} KM`);
    } else {
      console.log(`    reusing plan ${match.id}  ${plan.title}`);
    }
    ids[plan.key] = match.id;
  }
}

if (typeof args["webhook-url"] === "string") {
  const webhook = await whop("POST", "/webhooks", {
    url: args["webhook-url"],
    events: WEBHOOK_EVENTS,
    api_version_date: API_VERSION_DATE,
    resource_id: accountId,
    title: "Confetti billing",
  });
  console.log(`  created webhook ${webhook.id} → ${args["webhook-url"]}`);
  if (webhook.webhook_secret) ids.WHOP_WEBHOOK_SECRET = webhook.webhook_secret;
  else console.warn("  Whop returned no webhook_secret — copy it from the dashboard into WHOP_WEBHOOK_SECRET.");
}

// The app reads WHOP_API_KEY; locally that is the sandbox key while testing.
if (environment === "sandbox") ids.WHOP_API_KEY = apiKey;
writeEnv(ids);
console.log(`Wrote ${Object.keys(ids).filter((k) => !/KEY|SECRET/.test(k)).join(", ")} (and secrets) to .env.local`);
