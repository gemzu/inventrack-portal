"use client";

/**
 * Full-bleed hero.
 *
 * Not a headline-left / screenshot-right split. The stock wall is the page:
 * it fills the viewport edge to edge and bleeds off every side, so you arrive
 * inside the software rather than looking at a card containing a picture of it.
 * The headline sits over the wall like a title card.
 *
 * The sweep is one animation, not one per cell: a full-colour copy of the wall
 * is stacked over a dim copy and revealed with an animated clip-path, so the
 * cell count can change at any breakpoint without touching the keyframes.
 */

const SWEEP = 9; // seconds for one pass

/* Deterministic, plausible stock. Order is fixed so SSR and client agree. */
const CODES = [
  "PGD1668M", "MX1473", "Z619", "TRN0442", "KLM8891", "QP2210",
  "VX7735", "HD1902", "BRT5518", "NW3067", "LX4423", "GG9081",
  "TDY4410", "RS8827", "MP0194", "CH7742", "WK3318", "AZ6650",
  "FN2201", "JD9075", "EB4417", "UY1136", "SV8802", "OK5529",
  "PR3364", "LM7718", "XC2093", "BN6641", "TQ4405", "ZH1287",
  "DW9954", "GS3370", "IV6628", "AC1194", "NE8845", "RB2216",
];

const BAYS = ["A", "B", "C", "D", "E", "F"];

const CELLS = CODES.map((sku, i) => ({
  sku,
  bay: `${BAYS[Math.floor(i / 6) % BAYS.length]}${(i % 6) + 1}`,
  qty: [24, 8, 2, 16, 40, 6, 31, 12, 9, 27, 3, 18][i % 12],
}));

function Wall({ lit }: { lit: boolean }) {
  return (
    <div
      className="grid h-full w-full gap-px"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(7rem, 1fr))",
        gridAutoRows: "minmax(5.75rem, 1fr)",
      }}
      aria-hidden
    >
      {CELLS.map((c) => {
        const low = c.qty <= 3;
        return (
          <div key={c.sku} className="relative flex flex-col justify-end p-2.5">
            <div
              className="absolute inset-2 rounded-md border"
              /* Kept restrained: 36 cells stay lit for most of the cycle, so a
                 heavy fill or a per-cell glow washes the whole viewport out. */
              style={
                lit
                  ? {
                      borderColor: "color-mix(in oklab, var(--brand-1) 34%, transparent)",
                      background: "color-mix(in oklab, var(--brand-1) 6%, transparent)",
                    }
                  : { borderColor: "color-mix(in oklab, var(--foreground) 8%, transparent)" }
              }
            />
            <div className="relative leading-tight">
              <div
                className="mono truncate text-[10px]"
                style={{
                  color: lit
                    ? low
                      ? "var(--color-warning)"
                      : "var(--foreground)"
                    : "color-mix(in oklab, var(--foreground) 22%, transparent)",
                }}
              >
                {c.sku}
              </div>
              <div
                className="mono text-[9px]"
                style={{
                  color: lit
                    ? "var(--muted-foreground)"
                    : "color-mix(in oklab, var(--foreground) 14%, transparent)",
                }}
              >
                {c.bay} · {c.qty}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ScanWallHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      {/* The wall, bled past every edge so it reads as a fragment of something
          much larger. */}
      <div className="absolute -inset-x-8 -top-8 bottom-0">
        <Wall lit={false} />
        <div className="scanwall-lit absolute inset-0">
          <Wall lit />
        </div>
        <div className="scanwall-sweep" aria-hidden />
      </div>

      {/* Scrim: keeps the headline readable and lets the wall fade upward. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--background) 4%, color-mix(in oklab, var(--background) 82%, transparent) 34%, transparent 78%)",
        }}
      />

      <span className="sr-only">
        A live wall of storage bays. A scanner sweeps across it and each bay
        resolves into a stock record.
      </span>

      {/* Title card. */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-20 pt-32">
        {children}
      </div>
    </section>
  );
}

export { SWEEP };
