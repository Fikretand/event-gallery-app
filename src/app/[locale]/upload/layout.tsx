import type { Metadata } from "next";

import { privateMetadata } from "@/lib/seo";

/**
 * Guest upload pages are meant for the people holding the QR code.
 *
 * robots.txt already disallows this path, but a disallowed URL can still be
 * listed if someone links to it — only `noindex` keeps it out of results.
 */
export const metadata: Metadata = privateMetadata();

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
