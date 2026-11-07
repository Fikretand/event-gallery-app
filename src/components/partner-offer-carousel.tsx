"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n/index";

export type CarouselOffer = {
  id: string;
  partnerName: string;
  headline: string;
  body: string | null;
  code: string | null;
  validUntil: string | null;
  imageUrl: string | null;
  hasLink: boolean;
};

type Strings = {
  label: string;
  cta: string;
  codeLabel: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  slideOf: string;
};

/** How long each offer stays before the next one, in ms. */
const SLIDE_MS = 7000;

/**
 * Partner offers as a slideshow: one card at a time, the next after 7 s.
 * It holds still while the pointer or keyboard focus is on it, while the tab
 * is hidden, under reduced motion, and once the visitor presses pause. All
 * slides share one grid cell, so the box is as tall as the tallest offer and
 * the page never jumps when they change. One offer renders as a plain card.
 */
export function PartnerOfferCarousel({ offers, strings }: { offers: CarouselOffer[]; strings: Strings }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const hold = useRef(false);
  const touchX = useRef<number | null>(null);
  const count = offers.length;
  const many = count > 1;
  // When some offers have a picture, the others get a panel with the partner's
  // name in its place, so every slide has the same shape and none is half empty.
  const anyImage = offers.some((offer) => offer.imageUrl);

  useEffect(() => {
    if (!many || !playing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (hold.current || reduced.matches || document.hidden) return;
      setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [many, playing, count]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <section
      aria-label={strings.label}
      aria-roledescription={many ? "carousel" : undefined}
      onMouseEnter={() => (hold.current = true)}
      onMouseLeave={() => (hold.current = false)}
      onFocus={() => (hold.current = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold.current = false;
      }}
    >
      <div
        className="grid"
        aria-live={many && playing ? "off" : "polite"}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") touchX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (touchX.current === null || !many) return;
          const dx = e.clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => (touchX.current = null)}
      >
        {offers.map((offer, i) => {
          const active = i === index;
          return (
            <article
              key={offer.id}
              aria-roledescription={many ? "slide" : undefined}
              aria-label={many ? t(strings.slideOf, { n: String(i + 1), total: String(count) }) : undefined}
              aria-hidden={!active}
              className={`card col-start-1 row-start-1 flex flex-col overflow-hidden transition-opacity duration-500 ${active ? "visible opacity-100" : "invisible opacity-0"}`}
            >
              {offer.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={offer.imageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full bg-paper-3 object-cover" />
              ) : anyImage ? (
                <div aria-hidden="true" className="grid aspect-[16/9] w-full place-items-center bg-paper-2 px-[var(--space-lg)] text-center">
                  <span className="title text-ink-2">{offer.partnerName}</span>
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-[var(--space-lg)]">
                <p className="meta">
                  {strings.label}: {offer.partnerName}
                </p>
                <p className="title mt-1 text-ink">{offer.headline}</p>
                {offer.body ? <p className="mt-2 text-ink-2">{offer.body}</p> : null}
                {offer.code ? (
                  <p className="mt-3 text-sm text-ink-2">
                    {strings.codeLabel} <span className="code rounded-[var(--radius-inner)] bg-paper-2 px-2 py-1 font-semibold text-ink">{offer.code}</span>
                  </p>
                ) : null}
                {offer.validUntil ? <p className="meta mt-2">{offer.validUntil}</p> : null}
                {offer.hasLink ? <span aria-hidden="true" className="block min-h-[var(--space-md)] flex-1" /> : null}
                {offer.hasLink ? (
                  <a
                    href={`/api/partners/${offer.id}/click`}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    data-track={`partner_offer_${offer.id}`}
                    tabIndex={active ? undefined : -1}
                    className="btn btn-sm btn-secondary mt-auto self-start"
                  >
                    {strings.cta}
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {many ? (
        <div className="mt-[var(--space-sm)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => go(index - 1)} aria-label={strings.previous} className="btn btn-sm btn-quiet px-2">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label={strings.next} className="btn btn-sm btn-quiet px-2">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? strings.pause : strings.play} className="btn btn-sm btn-quiet px-2">
              {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center">
            {offers.map((offer, i) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t(strings.slideOf, { n: String(i + 1), total: String(count) })}
                aria-current={i === index ? "true" : undefined}
                className="group grid size-7 place-items-center"
              >
                <span className={`block size-2 rounded-full transition-colors ${i === index ? "bg-ink" : "bg-rule-2 group-hover:bg-muted"}`} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
