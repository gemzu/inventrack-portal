"use client";

/**
 * Kinetic Ink — "The Scan Line".
 *
 * The hero set-piece. A wall of boxes drawn as ink line-work; a violet→cyan
 * beam sweeps across on a loop. Everything the beam has passed resolves into
 * a lit record with a live readout. Everything ahead of it is a dim outline.
 *
 * That is the product in one gesture: a physical box becomes data the moment
 * it is scanned.
 *
 * Timing lives in globals.css (the `scan-*` keyframes). Beam and boxes share
 * one 7s clock; each column has its own keyframe set so a box lights as the
 * beam crosses it and stays lit until the sweep restarts.
 */

const COLS = 4;

/* Plausible warehouse codes, not lorem. */
const UNITS = [
  { sku: "PGD1668M", qty: 24, bay: "A1" },
  { sku: "MX1473", qty: 8, bay: "A2" },
  { sku: "Z619", qty: 2, bay: "A3" },
  { sku: "TRN0442", qty: 16, bay: "A4" },
  { sku: "KLM8891", qty: 40, bay: "B1" },
  { sku: "QP2210", qty: 6, bay: "B2" },
  { sku: "VX7735", qty: 31, bay: "B3" },
  { sku: "HD1902", qty: 12, bay: "B4" },
  { sku: "BRT5518", qty: 9, bay: "C1" },
  { sku: "NW3067", qty: 27, bay: "C2" },
  { sku: "LX4423", qty: 3, bay: "C3" },
  { sku: "GG9081", qty: 18, bay: "C4" },
];

export default function ScanLineHero() {
  return (
    <div className="scanwall relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur-sm shadow-glow">
      {/* Warehouse floor grid. Texture, and it reads as racking. */}
      <div aria-hidden className="scanwall-grid absolute inset-0" />

      {/* Header strip: reads as a live feed, not a browser chrome mock. */}
      <div className="relative flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="scanwall-live h-1.5 w-1.5 rounded-full bg-[var(--brand-1)]" />
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Bay A to C
          </span>
        </div>
        <span className="mono text-[10px] tracking-[0.14em] text-muted-foreground">
          12 units
        </span>
      </div>

      {/* The wall. */}
      <div className="relative px-4 py-5 sm:px-6 sm:py-7">
        <div
          className="scanwall-track relative grid gap-x-3 gap-y-4 sm:gap-x-4"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {UNITS.map((unit, i) => {
            /* Column drives which keyframe set runs, so a box lights exactly
               when the beam crosses it and stays lit until the sweep resets. */
            const col = i % COLS;
            return (
              <div
                key={unit.sku}
                className="scanwall-unit"
                data-col={col}
              >
                {/* Box glyph: lid line + body. */}
                <div className="scanwall-box relative aspect-[5/4] w-full rounded-md border">
                  <span className="absolute inset-x-0 top-1/3 border-t border-inherit" />
                </div>
                <div className="mt-1.5 leading-tight">
                  <div className="mono truncate text-[9px] tracking-tight sm:text-[10px]">
                    {unit.sku}
                  </div>
                  <div className="mono text-[9px] text-muted-foreground">
                    {unit.bay} · {unit.qty}
                  </div>
                </div>
              </div>
            );
          })}

          {/* The beam. Sits above the wall, sweeps left to right. */}
          <div aria-hidden className="scanwall-beam" />
        </div>
      </div>

      <span className="sr-only">
        An animated wall of twelve storage boxes. A scanning beam sweeps across
        them, and each box resolves into a record showing its SKU, bay and
        quantity.
      </span>
    </div>
  );
}
