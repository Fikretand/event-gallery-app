const optional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const env = {
  appName: "Confetti",
  appUrl: optional(process.env.NEXT_PUBLIC_APP_URL) ?? "http://localhost:3000",
  appSecret: optional(process.env.APP_SECRET),
  supabaseUrl: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: optional(process.env.SUPABASE_SERVICE_ROLE_KEY),
  r2AccountId: optional(process.env.R2_ACCOUNT_ID),
  r2AccessKeyId: optional(process.env.R2_ACCESS_KEY_ID),
  r2SecretAccessKey: optional(process.env.R2_SECRET_ACCESS_KEY),
  r2Bucket: optional(process.env.R2_BUCKET_NAME),
  r2PublicBaseUrl: optional(process.env.R2_PUBLIC_BASE_URL),
  mediaWorkerSecret: optional(process.env.MEDIA_WORKER_SECRET),
  cronSecret: optional(process.env.CRON_SECRET),
  // ── Payments (LemonSqueezy — dormant until configured) ──
  lemonSqueezyApiKey: optional(process.env.LEMONSQUEEZY_API_KEY),
  lemonSqueezyStoreId: optional(process.env.LEMONSQUEEZY_STORE_ID),
  lemonSqueezyWebhookSecret: optional(process.env.LEMONSQUEEZY_WEBHOOK_SECRET),
  lsVariantSoloMonthly: optional(process.env.LEMONSQUEEZY_VARIANT_SOLO_MONTHLY),
  lsVariantSoloYearly: optional(process.env.LEMONSQUEEZY_VARIANT_SOLO_YEARLY),
  lsVariantProMonthly: optional(process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY),
  lsVariantProYearly: optional(process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY),
  // ── Payments (Payhip — active provider) ──
  payhipWebhookSecret: optional(process.env.PAYHIP_WEBHOOK_SECRET),
  payhipProductOneEvent: optional(process.env.PAYHIP_PRODUCT_ONE_EVENT),
  payhipProductSoloMonthly: optional(process.env.PAYHIP_PRODUCT_SOLO_MONTHLY),
  payhipProductSoloYearly: optional(process.env.PAYHIP_PRODUCT_SOLO_YEARLY),
  payhipProductProMonthly: optional(process.env.PAYHIP_PRODUCT_PRO_MONTHLY),
  payhipProductProYearly: optional(process.env.PAYHIP_PRODUCT_PRO_YEARLY),
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasSupabaseAdmin = Boolean(hasSupabase && env.supabaseServiceRoleKey);
export const hasR2 = Boolean(
  env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2Bucket,
);
/** True once Payhip webhook secret is set — gates live checkout. */
export const hasPayments = Boolean(env.payhipWebhookSecret);

export function missingEnvMessage() {
  return "Missing environment variables. Copy .env.example and provide Supabase, R2, and app secrets before using protected flows.";
}
