import type { Metadata } from "next";

import { privateMetadata } from "@/lib/seo";

/**
 * Sign-in and sign-up screens add nothing to a search result.
 *
 * robots.txt already disallows this path, but a disallowed URL can still be
 * listed if someone links to it — only `noindex` keeps it out of results.
 */
export const metadata: Metadata = privateMetadata();

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
