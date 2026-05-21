"use client";

import { useState } from "react";

import { Panel } from "@/components/ui/panel";
import { testimonials } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export function MarketingTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="shell py-8 sm:py-10">
      <div className="flex flex-col gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">Social proof</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
          Built to feel premium on both sides of the event.
        </h2>
      </div>

      <div className="mt-8 lg:hidden">
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const container = event.currentTarget;
            const nextIndex = Math.round(container.scrollLeft / Math.max(container.clientWidth * 0.88, 1));
            setActiveIndex(Math.max(0, Math.min(nextIndex, testimonials.length - 1)));
          }}
        >
          {testimonials.map((item) => (
            <Panel
              key={`${item.author}-${item.role}`}
              className="mesh-card min-w-[88%] snap-center border-[#e5d7c8] bg-[radial-gradient(circle_at_top_right,rgba(226,121,82,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,241,233,0.96))] p-5 shadow-[0_22px_60px_rgba(18,24,38,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-ink)] text-2xl leading-none text-white shadow-[0_14px_30px_rgba(23,32,51,0.18)]">
                  &ldquo;
                </span>
                <span className="rounded-full border border-black/8 bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-moss)]">
                  Social proof
                </span>
              </div>
              <p className="mt-5 text-[1.02rem] leading-7 text-[var(--color-ink)]">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-6 border-t border-black/8 pt-4">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{item.author}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-black/48">{item.role}</p>
              </div>
            </Panel>
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {testimonials.map((item, index) => (
            <span
              key={`${item.author}-chip`}
              className={cn(
                "h-2.5 rounded-full transition-all",
                activeIndex === index ? "w-8 bg-[var(--color-accent)]" : "w-2.5 bg-black/12",
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 hidden gap-5 lg:grid lg:grid-cols-3">
        {testimonials.map((item) => (
          <Panel
            key={`${item.author}-${item.role}`}
            className="mesh-card border-[#e5d7c8] bg-[radial-gradient(circle_at_top_right,rgba(226,121,82,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,240,232,0.94))] shadow-[0_26px_70px_rgba(18,24,38,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-ink)] text-2xl leading-none text-white shadow-[0_14px_30px_rgba(23,32,51,0.18)]">
                &ldquo;
              </span>
              <span className="rounded-full border border-black/8 bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-moss)]">
                Social proof
              </span>
            </div>
            <p className="mt-5 text-[1.02rem] leading-7 text-[var(--color-ink)]">&ldquo;{item.quote}&rdquo;</p>
            <div className="mt-6 border-t border-black/8 pt-4">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{item.author}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-black/48">{item.role}</p>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}
