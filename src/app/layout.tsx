import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

/**
 * Site-wide defaults. Individual pages override the title and description and
 * add their own canonical + language alternates through `publicMetadata`.
 *
 * `metadataBase` is what turns the relative URLs elsewhere into absolute ones,
 * which Open Graph requires — without it, shared links preview as nothing.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} | Private event galleries`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Create private event galleries with guest uploads, QR access, and client-ready delivery.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The Bosnian pages live under /bs, nested inside this layout, so the <html>
  // element cannot carry their language — `[locale]/layout.tsx` marks that
  // subtree instead, which is what a screen reader reads.
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
