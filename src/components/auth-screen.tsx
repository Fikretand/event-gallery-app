import { SiteNav } from "@/components/site-nav";

/**
 * Every sign-in screen is one split: what this screen is for on the left
 * (the one h1, a line, the way to the other screen), the form on the right.
 * On a phone the form comes right after the heading, above the fold.
 */
export function AuthScreen({
  title,
  body,
  aside,
  children,
}: {
  title: string;
  body: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh">
      <SiteNav />
      <section className="shell grid gap-y-[var(--space-xl)] py-[var(--space-2xl)] lg:min-h-[calc(100svh-var(--nav-height))] lg:grid-cols-12 lg:items-center lg:gap-x-[var(--gap-columns)]">
        <div className="lg:col-span-5">
          <h1 className="display-s max-w-[16ch] text-ink">{title}</h1>
          <div className="lead mt-[var(--space-md)] max-w-[44ch]">{body}</div>
          {aside ? <div className="mt-[var(--space-lg)] hidden text-ink-2 lg:block">{aside}</div> : null}
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          {children}
          {aside ? <div className="mt-[var(--space-lg)] text-ink-2 lg:hidden">{aside}</div> : null}
        </div>
      </section>
    </main>
  );
}
