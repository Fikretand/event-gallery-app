import type { Metadata } from "next";

import { privateMetadata } from "@/lib/seo";

/**
 * Nothing behind the dashboard belongs in a search index.
 *
 * robots.txt already disallows this path, but a disallowed URL can still be
 * listed if someone links to it — only `noindex` keeps it out of results.
 */
export const metadata: Metadata = privateMetadata();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // `.app`: heads on a working screen are labels for what follows, not
  // display lines (base.css drops their measure cap here).
  return <div className="app">{children}</div>;
}
