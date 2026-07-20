import Link from "next/link";

// Branded 404 for any unknown route.
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Confetti
        </p>
        <p className="font-display mt-4 text-6xl font-semibold text-[var(--color-ink)]">404</p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
          Stranica nije pronađena
        </h1>
        <p className="mt-2 font-display text-lg italic text-black/50">Page not found</p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-black/60">
          Ova stranica ne postoji ili je premještena.
          <br />
          <span className="text-black/45">This page doesn’t exist or has moved.</span>
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--color-ink)_85%,black)]"
          >
            Nazad na početnu · Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
