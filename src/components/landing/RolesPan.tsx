"use client";

/**
 * ONE BOX, THREE PAIRS OF HANDS.
 *
 * The three roles are a handoff, not a feature list, so they are laid out as a
 * lateral pan: the page holds still and the panels travel sideways, the way the
 * box travels from the floor to the office to the buyer.
 */

import { useCallback, useRef } from "react";
import { HardHat, ClipboardCheck, ShoppingBag } from "lucide-react";
import { useScrollScrub } from "@/components/motion/useScrollScrub";

const HANDS = [
  {
    icon: HardHat,
    who: "The worker",
    does: "Scans it on the floor.",
    body: "Barcode, or the printed label when there is no barcode. Submits it without walking back to a desk.",
  },
  {
    icon: ClipboardCheck,
    who: "The admin",
    does: "Signs it into stock.",
    body: "Sees what came in, checks the count against what was expected, approves it. Or sends it back with a reason.",
  },
  {
    icon: ShoppingBag,
    who: "The buyer",
    does: "Orders it.",
    body: "Joins with a storefront code, browses the catalog you publish, and orders against real quantities.",
  },
];

export default function RolesPan() {
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((p: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const distance = Math.max(0, rail.scrollWidth - window.innerWidth + 48);
    rail.style.transform = `translate3d(${-p * distance}px, 0, 0)`;
  }, []);

  /* Reduced motion: the rail stays put and the panels simply stack. */
  useScrollScrub(trackRef, onProgress);

  return (
    <section aria-labelledby="hands-heading" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 pb-14 pt-24">
        <h2
          id="hands-heading"
          className="reveal font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl"
        >
          One box, three pairs of hands.
        </h2>
        <p className="reveal d1 mt-4 max-w-md text-muted-foreground">
          The same record, shown three different ways depending on who is
          holding it.
        </p>
      </div>

      {/* Lateral pan track. On reduced motion the rail simply wraps. */}
      <div ref={trackRef} className="relative" style={{ height: "260vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div
            ref={railRef}
            className="flex flex-col gap-6 px-6 will-change-transform motion-safe:flex-row motion-safe:flex-nowrap"
          >
            {/* Panels are wide on purpose: the rail must overflow the viewport
                by more than a screen or the pan has nothing to travel. */}
            {HANDS.map((h, i) => (
              <article
                key={h.who}
                className="grain relative flex w-full shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-glow motion-safe:h-[min(62vh,30rem)] motion-safe:w-[78vw] motion-safe:max-w-[52rem]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(24rem 16rem at 85% -10%, color-mix(in oklab, var(--brand-2) 18%, transparent), transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[var(--btn-shadow)]">
                      <h.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="mono text-[11px] tracking-[0.2em] text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <p className="mono mt-7 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {h.who}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em]">
                    {h.does}
                  </h3>
                </div>
                <p className="relative mt-6 text-sm leading-relaxed text-muted-foreground">
                  {h.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
