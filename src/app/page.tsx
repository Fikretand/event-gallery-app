import Image from "next/image";
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
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-6 py-10 sm:py-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6 sm:space-y-8">
          <div className="inline-flex rounded-full border border-[var(--color-moss)]/20 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
            Private galleries for photographers and modern wedding couples
          </div>
          <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white/75 lg:hidden">
            <Image
              src="/confetti-hero.svg"
              alt="Confetti gallery preview illustration"
              width={920}
              height={760}
              className="h-auto w-full"
              priority
            />
          </div>
          <div className="space-y-5">
            <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-6xl">
              Collect guest memories, deliver the polished gallery, and keep the whole event private.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/70 sm:text-lg sm:leading-8">
              Confetti helps photographers run clean event delivery and gives couples an easy one-link way to
              gather every guest photo without another app, folder, or messy thread.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <MarketingButtonLink href="/signup?intent=photographer" className="w-full px-6 shadow-[0_16px_40px_rgba(226,121,82,0.28)] sm:w-auto">
              Create your first event
            </MarketingButtonLink>
            <MarketingButtonLink href="/pricing" tone="ghost" className="w-full bg-white/70 px-6 sm:w-auto">
              View pricing
            </MarketingButtonLink>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Set up once",
                body: "One dashboard for event setup, guest uploads, and final delivery.",
                tone: "bg-[linear-gradient(180deg,#fffdf9,rgba(246,211,195,0.72))]",
              },
              {
                title: "Let guests send instantly",
                body: "Private guest upload page with QR access and optional PIN protection.",
                tone: "bg-[linear-gradient(180deg,#fcfffd,rgba(216,236,228,0.88))]",
              },
              {
                title: "Keep delivery controlled",
                body: "Separate pro gallery and guest content streams with moderation controls.",
                tone: "bg-[linear-gradient(180deg,#fffefd,rgba(242,234,223,0.95))]",
              },
            ].map((item) => (
              <Panel
                key={item.body}
                className={`mesh-card min-h-32 ${item.tone} md:bg-white/75`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-black/72">{item.body}</p>
              </Panel>
            ))}
          </div>
        </div>

        <Panel className="mesh-card flex flex-col gap-5 border-[#20304b]/70 bg-[linear-gradient(180deg,#1f2c44,#172033)] text-white lg:min-h-[640px]">
          <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-white/6 lg:block">
            <Image
              src="/confetti-hero.svg"
              alt="Confetti gallery preview illustration"
              width={920}
              height={760}
              className="h-auto w-full"
              priority
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d7e6dc]">
              How it works
            </p>
            <div className="space-y-4">
              {[
                "1. Create a private event space with one upload link and one protected gallery.",
                "2. Share the QR code so guests can send photos and videos without an app.",
                "3. Review what comes in, keep things private, and organize the event in one place.",
                "4. Revisit the gallery later to browse, download, and keep the full story together.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-3xl border border-white/10 bg-white/8 p-4 text-sm leading-6 text-white/88"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <MarketingTrustStrip />

      <MarketingTestimonials />

      <section className="shell py-10">
        <div className="rounded-[34px] border border-[#23344d]/70 bg-[radial-gradient(circle_at_top_left,rgba(226,121,82,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(104,146,128,0.16),transparent_26%),linear-gradient(180deg,#223149,#172033)] p-3 shadow-[0_30px_100px_rgba(18,24,38,0.18)] sm:p-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="mesh-card border-[#dde7e1] bg-[linear-gradient(180deg,rgba(242,248,245,0.98),rgba(227,237,232,0.9))]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
            For photographers
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Replace scattered delivery tools with one event workflow.
          </h2>
          <div className="mt-6 space-y-4">
            {photographerBenefits.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-[#cadcd2] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,247,243,0.9))] p-5"
              >
                <p className="text-base font-semibold text-[var(--color-ink)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-black/70">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <MarketingButtonLink href="/for-photographers" tone="ink" className="w-full sm:w-auto">
              See photographer workflow
            </MarketingButtonLink>
            <MarketingButtonLink href="/pricing" tone="ghost" className="w-full sm:w-auto">
              Compare plans
            </MarketingButtonLink>
          </div>
            </Panel>

            <Panel className="mesh-card border-[#e8d2c5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,211,195,0.54))]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">For couples</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            One wedding page, one QR code, one place for every guest memory.
          </h2>
          <div className="mt-6 space-y-4">
            {coupleBenefits.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-[#efd7c8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,241,0.92))] p-5"
              >
                <p className="text-base font-semibold text-[var(--color-ink)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-black/70">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <MarketingButtonLink href="/for-couples" className="w-full sm:w-auto">
              See couples plan
            </MarketingButtonLink>
            <MarketingButtonLink href="/pricing" tone="ghost" className="w-full sm:w-auto">
              View one-time pricing
            </MarketingButtonLink>
          </div>
            </Panel>
          </div>
        </div>
      </section>

      <section className="shell py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Start with a plan that matches how you actually run events.
            </h2>
          </div>
          <Link href="/pricing" className="text-sm font-semibold text-[var(--color-moss)] underline-offset-4 hover:underline">
            Open full pricing
          </Link>
        </div>

        <div className="mt-8">
          <PricingShowcase />
        </div>
      </section>

      {publicPhotographers.length > 0 ? (
        <section className="shell py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">Photographer spotlight</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                A warm little spotlight for photographers couples may want to book next.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/62">
                Included in photographer plans, this is a simple way to be discovered by people already exploring private galleries and guest-photo sharing for their own celebration.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicPhotographers.map((profile) => (
              <Panel key={profile.id} className="bg-white/88">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-[22px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
                    {profile.avatarPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarPreviewUrl} alt={profile.full_name ?? "Photographer"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        Confetti
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-ink)]">{profile.full_name ?? "Photographer"}</p>
                    {profile.city ? <p className="mt-1 text-sm text-black/58">{profile.city}</p> : null}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.website_url ? (
                    <MarketingButtonLink
                      href={profile.website_url}
                      tone="ghost"
                      className="px-3 py-2 text-xs"
                      external
                      aria-label={`Open website for ${profile.full_name ?? "photographer"}`}
                    >
                      <WebsiteIcon />
                    </MarketingButtonLink>
                  ) : null}
                  {profile.instagram_url ? (
                    <MarketingButtonLink
                      href={profile.instagram_url}
                      tone="ghost"
                      className="px-3 py-2 text-xs"
                      external
                      aria-label={`Open Instagram for ${profile.full_name ?? "photographer"}`}
                    >
                      <InstagramIcon />
                    </MarketingButtonLink>
                  ) : null}
                  {profile.facebook_url ? (
                    <MarketingButtonLink
                      href={profile.facebook_url}
                      tone="ghost"
                      className="px-3 py-2 text-xs"
                      external
                      aria-label={`Open Facebook for ${profile.full_name ?? "photographer"}`}
                    >
                      <FacebookIcon />
                    </MarketingButtonLink>
                  ) : null}
                  {profile.public_email_on_homepage && profile.email ? (
                    <MarketingButtonLink
                      href={`mailto:${profile.email}`}
                      tone="ghost"
                      className="px-3 py-2 text-xs"
                      aria-label={`Email ${profile.full_name ?? "photographer"}`}
                    >
                      <MailIcon />
                    </MarketingButtonLink>
                  ) : null}
                </div>
              </Panel>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shell py-10">
        <Panel className="mesh-card border-[#d9cfc1] bg-[linear-gradient(180deg,#fffdfa,rgba(242,234,223,0.9))]">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">FAQ</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                Clear answers before you trust one more event to a new tool.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-black/68">
                Confetti is designed around stable links, protected galleries, and a workflow that still feels
                friendly to guests using their phones in real time.
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
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="group rounded-[24px] border border-black/8 bg-white/88 p-5 shadow-[0_10px_30px_rgba(18,24,38,0.04)]"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--color-ink)] marker:content-none">
                    <span>{faq.question}</span>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-moss)] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 pr-10 text-sm leading-6 text-black/70">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Panel>
      </section>
    </main>
  );
}
