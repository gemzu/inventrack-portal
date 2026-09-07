"use client";

/**
 * THE AISLE.
 *
 * The previous hero tiled thirty six bay cards across the whole viewport. It
 * had no focal point and no depth, so it read as restless noise competing with
 * the headline. This replaces breadth with depth: a floor receding to a
 * vanishing point, a handful of tags suspended at different distances, and a
 * great deal of empty air.
 *
 * Depth is carried by scale, blur and opacity together, so near tags are sharp
 * and far ones fall away like real depth of field. Everything drifts slowly and
 * leans with the pointer, which keeps it alive without asking for attention.
 */

import { useEffect, useRef } from "react";

type Tag = {
  sku: string;
  bay: string;
  qty: number;
  /** 0 is nearest, 1 is furthest. Drives scale, blur and opacity together. */
  z: number;
  x: string;
  y: string;
  low?: boolean;
};

const TAGS: Tag[] = [
  { sku: "PGD1668M", bay: "A1", qty: 24, z: 0.05, x: "6%", y: "26%" },
  { sku: "Z619", bay: "A3", qty: 2, z: 0.3, x: "76%", y: "18%", low: true },
  { sku: "KLM8891", bay: "B1", qty: 40, z: 0.45, x: "22%", y: "58%" },
  { sku: "VX7735", bay: "B3", qty: 31, z: 0.62, x: "62%", y: "48%" },
  { sku: "TRN0442", bay: "A4", qty: 16, z: 0.78, x: "42%", y: "30%" },
  { sku: "NW3067", bay: "C2", qty: 27, z: 0.9, x: "86%", y: "62%" },
];

export default function AisleHero({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);

  /* Pointer lean. One rAF, two CSS variables, no React state. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let tx = 0;
    let ty = 0;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          el.style.setProperty("--px", tx.toFixed(4));
          el.style.setProperty("--py", ty.toFixed(4));
        });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="aisle relative isolate min-h-[100svh] overflow-hidden"
      style={{ ["--px" as string]: 0, ["--py" as string]: 0 }}
    >
      {/* Atmosphere. Two slow glows, nothing sharp. */}
      <div aria-hidden className="aisle-glow absolute inset-0" />

      {/* The floor, receding to a vanishing point. */}
      <div aria-hidden className="aisle-floor-wrap absolute inset-x-0 bottom-0 h-[62%]">
        <div className="aisle-floor" />
      </div>

      {/* Light sweeping down the aisle. */}
      <div aria-hidden className="aisle-sweep" />

      {/* Tags suspended at depth. */}
      <div aria-hidden className="absolute inset-0">
        {TAGS.map((t, i) => (
          <div
            key={t.sku}
            className="aisle-tag absolute"
            style={
              {
                left: t.x,
                top: t.y,
                "--z": t.z,
                "--i": i,
                "--dur": `${13 + i * 2.4}s`,
              } as React.CSSProperties
            }
          >
            <div className="aisle-tag__card">
              <span className="aisle-tag__bars" />
              <span className="mono block text-[13px] leading-tight">{t.sku}</span>
              <span
                className="mono block text-[12px] leading-tight"
                style={{ color: t.low ? "var(--color-warning)" : "var(--muted-foreground)" }}
              >
                {t.bay} · {t.qty}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scrim so the headline always wins. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--background) 6%, color-mix(in oklab, var(--background) 76%, transparent) 40%, transparent 82%)",
        }}
      />

      <span className="sr-only">
        A warehouse aisle receding into the distance, with stock tags suspended
        at different depths.
      </span>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-24 pt-32">
        {children}
      </div>
    </section>
  );
}
