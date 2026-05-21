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
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasSupabaseAdmin = Boolean(hasSupabase && env.supabaseServiceRoleKey);
export const hasR2 = Boolean(
  env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2Bucket,
);

export function missingEnvMessage() {
  return "Missing environment variables. Copy .env.example and provide Supabase, R2, and app secrets before using protected flows.";
}
