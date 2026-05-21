import Link from "next/link";
import { redirect } from "next/navigation";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { PricingShowcase } from "@/components/pricing-showcase";
import { Panel } from "@/components/ui/panel";
import { SiteNav } from "@/components/site-nav";
import { listPublicPhotographers } from "@/lib/events";
import { coupleBenefits, faqs, photographerBenefits } from "@/lib/marketing";

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.7 2.4 4.2 5.33 4.2 8.5S14.7 18.1 12 20.5c-2.7-2.4-4.2-5.33-4.2-8.5S9.3 5.9 12 3.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.2" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M13.3 20v-6.3h2.2l.33-2.58h-2.53V9.44c0-.75.2-1.26 1.28-1.26h1.37V5.87c-.24-.03-1.05-.1-2-.1-1.97 0-3.32 1.2-3.32 3.4v1.92H8.5v2.58h2.18V20h2.62Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m5.5 7.5 6.5 5 6.5-5" />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (resolvedSearchParams?.code) {
    const redirectTarget = resolvedSearchParams.next
      ? `/auth/confirm?code=${encodeURIComponent(resolvedSearchParams.code)}&next=${encodeURIComponent(resolvedSearchParams.next)}`
      : `/auth/confirm?code=${encodeURIComponent(resolvedSearchParams.code)}`;
    redirect(redirectTarget);
  }

  const publicPhotographers = await listPublicPhotographers();

  return (
    <main>
      <SiteNav />

      {/* Hero */}
      <section className="shell pb-10 pt-16 sm:pb-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex rounded-full border border-[var(--color-moss)]/20 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
            Private galleries · Guest uploads · QR sharing
          </div>
          <h1 className="font-display mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
            Every memory from your event, gathered in one private place.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-black/62 sm:text-lg sm:leading-8">
            Confetti gives photographers and couples a private gallery with guest upload, QR code sharing, and PIN-protected delivery — no app required for guests.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <MarketingButtonLink
              href="/signup?intent=photographer"
              className="w-full px-8 shadow-[0_12px_32px_rgba(226,121,82,0.30)] sm:w-auto"
            >
              Start for free
            </MarketingButtonLink>
            <MarketingButtonLink href="/pricing" tone="ghost" className="w-full bg-white/70 px-8 sm:w-auto">
              View pricing
            </MarketingButtonLink>
          </div>
        </div>

        {/* Feature strip */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              eyebrow: "Set up once",
              body: "One dashboard for event setup, guest uploads, and final delivery to clients.",
              tone: "bg-[linear-gradient(135deg,rgba(255,253,249,0.98),rgba(246,211,195,0.55))] border-[#edd5c5]",
            },
            {
              eyebrow: "Guests upload instantly",
              body: "Share a QR code — guests send photos and videos from their phones without installing anything.",
              tone: "bg-[linear-gradient(135deg,rgba(250,255,252,0.98),rgba(210,234,222,0.62))] border-[#c8e0d4]",
            },
            {
              eyebrow: "Delivery stays private",
              body: "Moderate uploads, hide unwanted files, and deliver the final gallery with PIN protection.",
              tone: "bg-[linear-gradient(135deg,rgba(255,254,251,0.98),rgba(242,234,223,0.75))] border-[#ddd4c6]",
            },
          ].map((item) => (
            <Panel key={item.eyebrow} className={`mesh-card ${item.tone}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
                {item.eyebrow}
              </p>
              <p className="mt-3 text-sm leading-6 text-black/68">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="shell py-12 sm:py-16">
        <div className="rounded-[36px] border border-[#22334c]/65 bg-[radial-gradient(ellipse_at_top_left,rgba(226,121,82,0.14),transparent_38%),radial-gradient(ellipse_at_bottom_right,rgba(56,88,77,0.18),transparent_40%),linear-gradient(160deg,#1e2d45,#172033)] px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.26em] text-[#a8c4b8]">
            How it works
          </p>
          <h2 className="font-display mt-4 text-center text-3xl font-semibold text-white sm:text-4xl">
            From setup to delivered gallery in four steps.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Create your event", body: "Set a title, expiry date, and optional upload PIN. Takes under two minutes." },
              { n: "02", title: "Share the QR code", body: "Print it, send it, or put it on a table. Guests tap and upload — no account needed." },
              { n: "03", title: "Review and curate", body: "Hide, restore, or delete uploads from your dashboard. You control what stays." },
              { n: "04", title: "Deliver the gallery", body: "Share the PIN-protected gallery link. Clients browse and download what they love." },
            ].map((step) => (
              <div
                key={step.n}
                className="rounded-[24px] border border-white/10 bg-white/7 p-6"
              >
                <p className="font-display text-4xl font-semibold text-white/20">{step.n}</p>
                <p className="mt-4 text-base font-semibold text-white/90">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/55">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingTrustStrip />

      <MarketingTestimonials />

      {/* For photographers / For couples */}
      <section className="shell py-12 sm:py-16">
        <div className="rounded-[34px] border border-[#23344d]/65 bg-[radial-gradient(circle_at_top_left,rgba(226,121,82,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(104,146,128,0.14),transparent_26%),linear-gradient(180deg,#223149,#172033)] p-3 shadow-[0_30px_80px_rgba(18,24,38,0.14)] sm:p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="mesh-card border-[#dde7e1] bg-[linear-gradient(160deg,rgba(245,251,248,0.98),rgba(224,238,232,0.82))]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
                For photographers
              </p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                Replace scattered delivery tools with one event workflow.
              </h2>
              <div className="mt-6 space-y-3">
                {photographerBenefits.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[20px] border border-[#cdddd4] bg-white/85 p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-black/65">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <MarketingButtonLink href="/for-photographers" tone="ink" className="w-full sm:w-auto">
                  Photographer workflow
                </MarketingButtonLink>
                <MarketingButtonLink href="/pricing" tone="ghost" className="w-full sm:w-auto">
                  Compare plans
                </MarketingButtonLink>
              </div>
            </Panel>

            <Panel className="mesh-card border-[#e8d2c4] bg-[linear-gradient(160deg,rgba(255,253,250,0.98),rgba(248,230,218,0.65))]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
                For couples & event hosts
              </p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                One event page, one QR code, every guest memory in one place.
              </h2>
              <div className="mt-6 space-y-3">
                {coupleBenefits.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[20px] border border-[#efd8c9] bg-white/85 p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-black/65">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <MarketingButtonLink href="/for-couples" className="w-full sm:w-auto">
                  See couples plan
                </MarketingButtonLink>
                <MarketingButtonLink href="/pricing" tone="ghost" className="w-full sm:w-auto">
                  One-time pricing
                </MarketingButtonLink>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="shell py-12 sm:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">Pricing</p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              A plan for every kind of event.
            </h2>
          </div>
          <Link
            href="/pricing"
            className="text-sm font-semibold text-[var(--color-moss)] underline-offset-4 hover:underline"
          >
            Full pricing details →
          </Link>
        </div>
        <div className="mt-8">
          <PricingShowcase />
        </div>
      </section>

      {/* Photographer spotlight */}
      {publicPhotographers.length > 0 ? (
        <section className="shell py-12 sm:py-16">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
              Photographer spotlight
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Photographers you may want to book.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/58">
              A small spotlight for photographers already on Confetti. Included in every photographer plan.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicPhotographers.map((profile) => (
              <Panel key={profile.id} className="bg-white/88">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-[18px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
                    {profile.avatarPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarPreviewUrl} alt={profile.full_name ?? "Photographer"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40">
                        Photo
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{profile.full_name ?? "Photographer"}</p>
                    {profile.city ? <p className="mt-0.5 text-sm text-black/52">{profile.city}</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.website_url ? (
                    <MarketingButtonLink href={profile.website_url} tone="ghost" className="px-3 py-2 text-xs" external aria-label={`Website for ${profile.full_name}`}>
                      <WebsiteIcon />
                    </MarketingButtonLink>
                  ) : null}
                  {profile.instagram_url ? (
                    <MarketingButtonLink href={profile.instagram_url} tone="ghost" className="px-3 py-2 text-xs" external aria-label={`Instagram for ${profile.full_name}`}>
                      <InstagramIcon />
                    </MarketingButtonLink>
                  ) : null}
                  {profile.facebook_url ? (
                    <MarketingButtonLink href={profile.facebook_url} tone="ghost" className="px-3 py-2 text-xs" external aria-label={`Facebook for ${profile.full_name}`}>
                      <FacebookIcon />
                    </MarketingButtonLink>
                  ) : null}
                  {profile.public_email_on_homepage && profile.email ? (
                    <MarketingButtonLink href={`mailto:${profile.email}`} tone="ghost" className="px-3 py-2 text-xs" aria-label={`Email ${profile.full_name}`}>
                      <MailIcon />
                    </MarketingButtonLink>
                  ) : null}
                </div>
              </Panel>
            ))}
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="shell py-12 sm:py-16">
        <Panel className="mesh-card border-[#d9cfc1] bg-[linear-gradient(160deg,#fffdfb,rgba(242,234,223,0.85))]">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">FAQ</p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                Questions before you commit.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-black/62">
                Confetti is built around stable links, protected galleries, and a flow that works for guests on their phones in real time.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <MarketingButtonLink href="/signup?intent=photographer" className="w-full sm:w-auto">
                  Start free
                </MarketingButtonLink>
                <MarketingButtonLink href="/pricing" tone="ghost" className="w-full sm:w-auto">
                  See pricing
                </MarketingButtonLink>
              </div>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="group rounded-[20px] border border-black/8 bg-white/85 p-5"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--color-ink)] marker:content-none">
                    <span>{faq.question}</span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-moss)] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-6 text-black/65">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      {/* Footer CTA */}
      <section className="shell pb-20 pt-4">
        <div className="rounded-[32px] bg-[radial-gradient(ellipse_at_top,rgba(226,121,82,0.15),transparent_50%),linear-gradient(180deg,rgba(255,252,248,0.96),rgba(242,234,223,0.88))] px-8 py-14 text-center border border-[#e0d4c4]">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-moss)]">
            Ready when you are
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
            Your next event deserves a better home.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-black/60">
            Free to start. No credit card required. Your first event is live in under two minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <MarketingButtonLink href="/signup?intent=photographer" className="w-full px-8 shadow-[0_12px_32px_rgba(226,121,82,0.25)] sm:w-auto">
              Create your first event
            </MarketingButtonLink>
            <MarketingButtonLink href="/signup?intent=couple" tone="ghost" className="w-full bg-white/70 px-8 sm:w-auto">
              I&apos;m hosting an event
            </MarketingButtonLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/8 bg-[var(--color-paper)]/40">
        <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-ink)]">Confetti</p>
            <p className="mt-1 text-xs text-black/45">Private galleries for every celebration.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/50">
            <Link href="/for-photographers" className="hover:text-[var(--color-ink)]">For photographers</Link>
            <Link href="/for-couples" className="hover:text-[var(--color-ink)]">For couples</Link>
            <Link href="/pricing" className="hover:text-[var(--color-ink)]">Pricing</Link>
            <Link href="/login" className="hover:text-[var(--color-ink)]">Log in</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
