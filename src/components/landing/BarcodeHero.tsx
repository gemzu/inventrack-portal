"use client";

/**
 * THE BARCODE IS THE BUILDING.
 *
 * One figure that reads three ways at once: a barcode, which is the atom of
 * this product; a rack elevation, which is the building; and a bar chart,
 * because every bar's height is the quantity in that bay. The background is
 * therefore the stock itself rather than an ornament behind the stock.
 *
 * It is calm because everything shares one baseline and one rhythm. The
 * previous hero scattered blurred cards across the viewport, which is a stock
 * hero trope and had no focal point.
 *
 * A count wave travels left to right forever: each bar lifts and lights as it
 * is reached, then settles. One keyframe pair, offset per bar, so the whole
 * field costs two composited properties and no JavaScript.
 */

const COUNT = 76;

/* Deterministic, so server and client agree. Widths follow a barcode rhythm;
   heights are quantities, with a few bays running low. */
const WIDTHS = [3, 7, 2, 5, 9, 3, 4, 2, 6, 8, 3, 5, 2, 7, 4, 10, 3, 6];

/* Width carries the barcode rhythm. Height stays high and only slightly
   uneven, so the silhouette reads as a barcode and a rack elevation rather
   than an audio meter, which is what strong height variation produces.
   A low bay is expressed as colour, not as a short bar. */
const BARS = Array.from({ length: COUNT }, (_, i) => {
  const w = WIDTHS[i % WIDTHS.length];
  const h = 56 + ((i * 29) % 36);
  return { w, h, low: (i * 17) % 23 === 0 };
});

const CYCLE = 8; // seconds for the count wave to cross

export default function BarcodeHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      {/* Atmosphere sitting behind the rack. */}
      <div aria-hidden className="barcode-glow absolute inset-0" />

      {/* The rack. Bottom anchored, which is what keeps it restful. */}
      <div
        aria-hidden
        className="barcode-field absolute inset-x-0 bottom-0 flex h-[62%] items-end justify-center gap-[0.3vw] px-[2vw]"
      >
        {BARS.map((b, i) => (
          <span
            key={i}
            className={`barcode-bar${b.low ? " is-low" : ""}`}
            /* Proportional rather than fixed px, so the rack spans any
               viewport instead of clustering in the middle. */
            style={
              {
                flex: `${b.w} 0 0px`,
                height: `${b.h}%`,
                "--d": `${((i / COUNT) * CYCLE).toFixed(2)}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Scrim so the headline always wins over the rack. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--background) 2%, color-mix(in oklab, var(--background) 68%, transparent) 46%, transparent 88%)",
        }}
      />

      <span className="sr-only">
        A barcode drawn from live stock levels, where each bar is the quantity
        held in one bay. A counting pass travels across it.
      </span>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-24 pt-32">
        {children}
      </div>
    </section>
  );
}
