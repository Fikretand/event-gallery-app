import { env } from "@/lib/env";
import { MarketingButtonLink } from "@/components/marketing-button-link";
import Link from "next/link";

export function SiteNav() {
  return (
    <header className="shell flex items-center justify-between py-6">
      <Link href="/" className="text-lg font-semibold tracking-[0.18em] text-[var(--color-moss)] uppercase">
        {env.appName}
      </Link>
      <nav className="hidden items-center gap-2 text-sm font-medium md:flex">
        <Link href="/for-photographers" className="rounded-full px-4 py-2 text-[var(--color-ink)] hover:bg-white/70">
          For photographers
        </Link>
        <Link href="/for-couples" className="rounded-full px-4 py-2 text-[var(--color-ink)] hover:bg-white/70">
          For couples
        </Link>
        <Link href="/pricing" className="rounded-full px-4 py-2 text-[var(--color-ink)] hover:bg-white/70">
          Pricing
        </Link>
      </nav>
      <nav className="flex items-center gap-3 text-sm font-medium">
        <Link href="/login" className="rounded-full px-4 py-2 text-[var(--color-ink)] hover:bg-white/70">
          Login
        </Link>
        <MarketingButtonLink href="/signup?intent=photographer" className="min-w-[128px] whitespace-nowrap ring-1 ring-black/8">
          Start free
        </MarketingButtonLink>
      </nav>
    </header>
  );
}
