/**
 * One-time setup script: configure CORS on the R2 bucket so browsers can
 * upload directly via presigned PUT URLs from all allowed origins.
 *
 * Run from the project root:
 *   node --env-file=.env.local scripts/setup-r2-cors.mjs
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`✗  Missing env var: ${name}`);
    process.exit(1);
  }
  return value;
};

const accountId = required("R2_ACCOUNT_ID");
const accessKeyId = required("R2_ACCESS_KEY_ID");
const secretAccessKey = required("R2_SECRET_ACCESS_KEY");
const bucket = required("R2_BUCKET_NAME");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const corsRules = {
  Bucket: bucket,
  CORSConfiguration: {
    CORSRules: [
      {
        // Allow direct browser uploads from all app origins
        AllowedOrigins: [
          "http://localhost:3000",
          "http://192.168.0.34:3000",
          "https://event-gallery-app-rho.vercel.app",
        ],
        AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag", "Content-Length"],
        MaxAgeSeconds: 3600,
      },
    ],
  },
};

console.log(`\nConfiguring CORS on R2 bucket: ${bucket}`);
console.log("Allowed origins:");
corsRules.CORSConfiguration.CORSRules[0].AllowedOrigins.forEach((o) =>
  console.log("  •", o),
);

try {
  await client.send(new PutBucketCorsCommand(corsRules));
  console.log("\n✓  CORS configured successfully.\n");

  // Verify by reading back
  const result = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("Verified CORS rules on bucket:");
  result.CORSRules?.forEach((rule, i) => {
    console.log(`  Rule ${i + 1}:`);
    console.log(`    Origins : ${rule.AllowedOrigins?.join(", ")}`);
    console.log(`    Methods : ${rule.AllowedMethods?.join(", ")}`);
    console.log(`    Headers : ${rule.AllowedHeaders?.join(", ")}`);
  });
} catch (error) {
  console.error("\n✗  Failed to configure CORS:", error.message);
  process.exit(1);
}
