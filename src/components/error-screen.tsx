import Link from "next/link";

/**
 * The 404 and error screens. Both languages, because these screens appear
 * before the app knows which one the visitor reads: Bosnian first (the
 * published language), English under it.
 */
export function ErrorScreen({
  code,
  titleBs,
  titleEn,
  bodyBs,
  bodyEn,
  actions,
}: {
  code?: string;
  titleBs: string;
  titleEn: string;
  bodyBs: string;
  bodyEn: string;
  actions: React.ReactNode;
}) {
  return (
    <main className="shell flex min-h-dvh flex-col justify-center py-[var(--space-3xl)]">
      <Link
        href="/"
        className="self-start rounded-[var(--radius-inner)] font-display text-[1.625rem] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]"
      >
        Confetti
      </Link>
      <div className="mt-[var(--space-2xl)] max-w-2xl">
        {code ? <p className="num font-display text-[length:var(--text-display)] font-semibold leading-none text-ink-2">{code}</p> : null}
        <h1 className="display-s mt-[var(--space-md)] text-ink">{titleBs}</h1>
        <p className="title mt-[var(--space-xs)] text-ink-2" lang="en">
          {titleEn}
        </p>
        <p className="mt-[var(--space-lg)] max-w-[52ch] text-ink-2">{bodyBs}</p>
        <p className="mt-[var(--space-2xs)] max-w-[52ch] text-muted" lang="en">
          {bodyEn}
        </p>
        <div className="mt-[var(--space-xl)] flex flex-col gap-3 sm:flex-row">{actions}</div>
      </div>
    </main>
  );
}
