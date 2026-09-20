import type { Metadata } from "next";

import { privateMetadata } from "@/lib/seo";

/**
 * Event galleries hold real people's photographs behind a shared link.
 *
 * robots.txt already disallows this path, but a disallowed URL can still be
 * listed if someone links to it — only `noindex` keeps it out of results.
 */
export const metadata: Metadata = privateMetadata();

export default function GalleryRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
