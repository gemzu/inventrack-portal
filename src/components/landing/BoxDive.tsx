"use client";

/**
 * THE DIVE — "Open the box."
 *
 * A box-shaped mask sits centre screen and zooms open as you scroll, until it
 * swallows the viewport. What is revealed is not stock footage, it is the
 * product's own surface: the inventory record the box becomes once scanned.
 * Physical container to data container, which is the same tension the hero
 * states, escalated.
 *
 * Pinning is CSS `position: sticky`, not a JS pin, so there is no pin-spacer
 * to fight with and the page background stays themeable. Progress comes from
 * useScrollScrub, which measures rather than caches. See that file for why.
 */

import { useCallback, useRef } from "react";
import { ScanLine } from "lucide-react";
import { useScrollScrub } from "@/components/motion/useScrollScrub";

/* Isometric cube silhouette. Reads as a box at small sizes, which is the only
   size where the shape is legible. */
const BOX_PATH = "M50 3 L93 27.5 L93 72.5 L50 97 L7 72.5 L7 27.5 Z";
const BOX_MASK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23000000"><path d="${BOX_PATH}"/></svg>`;

const ROWS = [
  { sku: "PGD1668M", name: "Hex bolt M12, zinc", qty: 24, bay: "A1", state: "In stock" },
  { sku: "MX1473", name: "Bearing housing, cast", qty: 8, bay: "A2", state: "In stock" },
  { sku: "Z619", name: "Drive belt, 1200mm", qty: 2, bay: "A3", state: "Low" },
  { sku: "TRN0442", name: "Coupler, stainless", qty: 16, bay: "A4", state: "In stock" },
  { sku: "KLM8891", name: "Gasket set, nitrile", qty: 40, bay: "B1", state: "In stock" },
  { sku: "QP2210", name: "Pressure valve, 3in", qty: 6, bay: "B2", state: "Awaiting approval" },
];

function startSize() {
  if (typeof window === "undefined") return 360;
  if (window.innerWidth < 640) return 190;
  if (window.innerWidth < 1024) return 260;
  return 330;
}

export default function BoxDive() {
  const trackRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((p: number) => {
    const mask = maskRef.current;
    if (mask) {
      /* Eased so the box stays a box for a while, then opens fast. */
      const px = startSize() + Math.pow(p, 2.3) * 5200;
      mask.style.webkitMaskSize = `${px}px`;
      mask.style.maskSize = `${px}px`;
    }
    if (surfaceRef.current) {
      surfaceRef.current.style.transform = `scale(${1 + p * 0.16})`;
    }
    if (capRef.current) {
      capRef.current.style.opacity = String(Math.max(0, 1 - p * 3.4));
    }
  }, []);

  const onReduced = useCallback(() => {
    /* Resting state: the box is already open. */
    const mask = maskRef.current;
    if (mask) {
      mask.style.webkitMaskImage = "none";
      mask.style.maskImage = "none";
    }
    if (capRef.current) capRef.current.style.opacity = "0";
  }, []);

  useScrollScrub(trackRef, onProgress, onReduced);

  return (
    <section aria-labelledby="dive-heading">
      {/* Lead-in. Reveals normally before the pinned stretch begins. */}
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-24">
        <div className="reveal max-w-xl">
          <h2
            id="dive-heading"
            className="font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl"
          >
            Scan it and the box opens.
          </h2>
          <p className="reveal d1 mt-4 text-muted-foreground">
            Not the cardboard. The record. Quantity, bay, lot number, what it
            cost you, and who touched it last.
          </p>
        </div>
      </div>

      {/* The scroll track. Its height is the length of the dive. */}
      <div ref={trackRef} className="relative" style={{ height: "320vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* Corner ticks. A frame, so the viewport reads as an aperture. */}
          {[
            "left-3 top-3 border-l border-t",
            "right-3 top-3 border-r border-t",
            "left-3 bottom-3 border-b border-l",
            "right-3 bottom-3 border-b border-r",
          ].map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute z-30 h-5 w-5 border-foreground/25 ${pos}`}
            />
          ))}

          {/* Ambient watermark. Keeps the empty plate from reading unfinished. */}
          <span
            aria-hidden
            className="pointer-events-none absolute select-none font-display text-[22vw] font-extrabold tracking-tighter text-foreground opacity-[0.028]"
          >
            INVEMS
          </span>

          {/* The masked portal. */}
          <div
            ref={maskRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              WebkitMaskImage: `url('${BOX_MASK}')`,
              maskImage: `url('${BOX_MASK}')`,
              WebkitMaskPosition: "50% 50%",
              maskPosition: "50% 50%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "330px",
              maskSize: "330px",
            }}
          >
            <div
              ref={surfaceRef}
              className="grain relative h-full w-full origin-center overflow-hidden bg-card will-change-transform"
            >
              {/* Atmosphere behind the surface. */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60rem 34rem at 50% 0%, color-mix(in oklab, var(--brand-2) 20%, transparent), transparent 70%), radial-gradient(46rem 30rem at 85% 100%, color-mix(in oklab, var(--brand-3) 14%, transparent), transparent 70%)",
                }}
              />

              {/* The operation itself. */}
              <div className="relative flex h-full w-full items-center justify-center p-6">
                <div className="w-full max-w-3xl rounded-2xl border border-border bg-background/80 shadow-glow backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-[var(--brand-1)]" />
                      <span className="font-display text-sm font-bold tracking-tight">
                        Inventory
                      </span>
                    </div>
                    <span className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Bay A to B
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    {ROWS.map((r) => (
                      <div
                        key={r.sku}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-2.5 sm:grid-cols-[7rem_1fr_auto_auto]"
                      >
                        <span className="mono text-[11px] text-[var(--brand-1)]">{r.sku}</span>
                        <span className="hidden truncate text-xs text-foreground sm:block">
                          {r.name}
                        </span>
                        <span className="mono text-[11px] text-muted-foreground">
                          {r.bay} · {r.qty}
                        </span>
                        <span
                          className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:block ${
                            r.state === "Low"
                              ? "bg-warning/15 text-warning"
                              : r.state === "Awaiting approval"
                                ? "bg-[var(--brand-2)]/15 text-[var(--brand-2)]"
                                : "bg-success/15 text-success"
                          }`}
                        >
                          {r.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Caption over the closed box. Fades as the box opens. */}
          <div
            ref={capRef}
            className="pointer-events-none absolute bottom-[14%] z-20 text-center"
          >
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Keep scrolling
            </p>
          </div>
        </div>
      </div>

      {/* Payoff. */}
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20">
        <div className="reveal max-w-xl">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            One shelf, or forty facilities.
          </h2>
          <p className="reveal d1 mt-4 text-muted-foreground">
            The view does not change. Only how much of it there is.
          </p>
        </div>
      </div>
    </section>
  );
}
