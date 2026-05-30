import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  // The QR poster renderer loads TTF fonts from /public so Resvg can embed
  // real glyphs (Vercel's serverless image has no system fonts available).
  // Next.js wouldn't auto-trace these binary assets, so we list them
  // explicitly so they ship with the serverless function bundle.
  outputFileTracingIncludes: {
    "/api/events/[slug]/qr-poster": ["./public/fonts/poster/**/*.ttf"],
  },
};

export default nextConfig;
