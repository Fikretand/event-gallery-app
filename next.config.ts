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
  // Native node modules can't be bundled by Turbopack (`.node` binaries fail
  // with "non-ecmascript placeable asset"). Mark them as external so they're
  // loaded from node_modules at runtime instead.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  // The QR poster renderer loads TTF fonts from /public so Resvg can embed
  // real glyphs (Vercel's serverless image has no system fonts available).
  // Next.js wouldn't auto-trace these binary assets, so we list them
  // explicitly so they ship with the serverless function bundle.
  outputFileTracingIncludes: {
    "/api/events/[slug]/qr-poster": ["./public/fonts/poster/**/*.ttf"],
  },
  async headers() {
    // Galleries and guest upload pages are reachable by link alone, so assume
    // the link will eventually leak — into a group chat, a screenshot, a
    // forwarded message. These headers decide what happens when it does.
    //
    // The pages already render `noindex` through `privateMetadata`. The header
    // repeats it because a crawler that fetches the URL without executing the
    // page — or fetches a file rather than a document — never sees the meta
    // tag. Belt and braces, and they cost nothing.
    const privatePaths = [
      "/gallery/:path*",
      "/upload/:path*",
      "/dashboard/:path*",
      "/admin/:path*",
      "/:locale(en|bs)/gallery/:path*",
      "/:locale(en|bs)/upload/:path*",
      "/:locale(en|bs)/dashboard/:path*",
      "/:locale(en|bs)/admin/:path*",
    ];

    const noIndex = {
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noimageindex, noarchive",
    };

    // Without this, clicking any outbound link from a gallery hands the
    // destination the full secret URL in the Referer header. A gallery link is
    // the only thing protecting those photographs when no PIN is set.
    const noReferrer = { key: "Referrer-Policy", value: "no-referrer" };

    return [
      ...privatePaths.map((source) => ({ source, headers: [noIndex, noReferrer] })),
      {
        // The marketing pages are meant to be indexed, but still should not
        // leak full URLs to third parties they link out to.
        source: "/:path*",
        headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
    ];
  },
};

export default nextConfig;
