import { Panel } from "@/components/ui/panel";
import { getDictionary } from "@/lib/i18n/index";
import type { Locale } from "@/lib/i18n/index";

function TrustIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "qr":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <path d="M14 14h2v2h-2zM18 14h2v6h-2M14 18h4" />
        </svg>
      );
    case "gallery":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M7 15l3-3 2.5 2.5L15 12l3 3" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6l7-3z" />
          <path d="M9.5 12.2l1.8 1.8 3.7-4" />
        </svg>
      );
  }
}

export function MarketingTrustStrip({ locale = "en" }: { locale?: Locale }) {
  const dict = getDictionary(locale);
  const items = dict.trustStrip;

  return (
    <section className="shell py-8 sm:py-10">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Panel key={item.title} className="mesh-card bg-white/80">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,var(--color-accent-soft),#f8e0d3)] text-[var(--color-moss)] shadow-[0_10px_24px_rgba(226,121,82,0.16)]">
              <TrustIcon kind={item.icon} />
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--color-ink)]">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-black/70">{item.body}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}
