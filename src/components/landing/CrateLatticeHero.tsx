"use client";

/**
 * THE MARK IS THE WAREHOUSE.
 *
 * The Invems logo is three isometric cubes in stroke line-work: a stack of
 * crates. A pointy-top hexagon tiles seamlessly, so the mark's own unit is
 * repeated into a full wall of stacked crates. The background is therefore
 * built from the brand rather than placed near it.
 *
 * The logo's exact three-cube arrangement sits inside the lattice, held lit:
 * the mark hiding in the thing it describes. One above, two below, which is
 * how the cubes fall out of the tiling for free.
 *
 * A count wave crosses on the diagonal, lighting each crate as it is reached.
 * Geometry is one reused <symbol>; only opacity animates.
 */

/* Unit taken from public/logo.svg, recentred on the origin.
   Hexagon is 128 wide and 148 tall, points top and bottom. */
const CUBE_OUTLINE = "M0 -74 L64 -37 L64 37 L0 74 L-64 37 L-64 -37 Z";
const CUBE_SPINE = "M0 0 L0 -74 M0 0 L64 37 M0 0 L-64 37";

const COLS = 15;
const ROWS = 10;
const DX = 128;
const DY = 111; /* three quarters of the height, which is how hexes stack. */
const CYCLE = 9;

/* Where the real logo sits in the field. Top crate, then the two beneath it.
   Placed upper right: clear of the headline, and out of the busiest part of
   the wave, where it was previously indistinguishable from a lit crate. */
const MARK_ROW = 2;
const MARK_COL = 10;

type Crate = { x: number; y: number; delay: string; isMark: boolean };

const CRATES: Crate[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = c * DX + (r % 2 ? DX : DX / 2);
    const y = r * DY;
    const isMark =
      (r === MARK_ROW && c === MARK_COL) ||
      (r === MARK_ROW + 1 && (c === MARK_COL - 1 || c === MARK_COL));
    /* Diagonal wave: columns lead, rows trail slightly. */
    const t = (c + r * 0.45) / (COLS + ROWS * 0.45);
    CRATES.push({ x, y, delay: `${(t * CYCLE).toFixed(2)}s`, isMark });
  }
}

const VB_W = COLS * DX + DX;
const VB_H = (ROWS - 1) * DY + 148;

export default function CrateLatticeHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      <div aria-hidden className="crate-glow absolute inset-0" />

      <div aria-hidden className="crate-field absolute inset-0">
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <g id="crate" strokeLinejoin="round" strokeLinecap="round">
              <path d={CUBE_OUTLINE} />
              <path d={CUBE_SPINE} />
            </g>
          </defs>

          {/* Resting lattice. */}
          <g className="crate-dim" strokeWidth={5}>
            {CRATES.map((c, i) => (
              <use key={`d${i}`} href="#crate" x={c.x} y={c.y} />
            ))}
          </g>

          {/* The count wave. Each crate lights as it is reached. */}
          <g className="crate-wave" strokeWidth={6}>
            {CRATES.map((c, i) => (
              <use
                key={`l${i}`}
                href="#crate"
                x={c.x}
                y={c.y}
                style={{ animationDelay: c.delay }}
              />
            ))}
          </g>

          {/* The mark itself, held. */}
          <g className="crate-mark" strokeWidth={8}>
            {CRATES.filter((c) => c.isMark).map((c, i) => (
              <use key={`m${i}`} href="#crate" x={c.x} y={c.y} />
            ))}
          </g>
        </svg>
      </div>

      {/* Scrim so the headline always wins. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--background) 4%, color-mix(in oklab, var(--background) 74%, transparent) 44%, transparent 92%)",
        }}
      />

      <span className="sr-only">
        A wall of stacked crates drawn from the Invems mark, with a counting
        pass moving across it.
      </span>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-24 pt-32">
        {children}
      </div>
    </section>
  );
}
