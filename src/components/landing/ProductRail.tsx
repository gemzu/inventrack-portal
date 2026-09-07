"use client";

/**
 * The conveyor.
 *
 * Four real surfaces from the app travelling past the viewport. They are not
 * flat cards on a slider: each one turns away from you in 3D as it leaves
 * centre and squares up as it arrives, the way a crate does passing you on a
 * belt. Centre is upright, full contrast and full scale; the edges fall back.
 *
 * The rail moves on one transform; each panel takes a second, both composited.
 */

import { useCallback, useRef } from "react";
import { Check, X, TrendingUp } from "lucide-react";
import { useScrollScrub } from "@/components/motion/useScrollScrub";

const STOCK = [
  { sku: "PGD1668M", name: "Hex bolt M12, zinc", qty: 24, bay: "A1", tone: "ok" },
  { sku: "MX1473", name: "Bearing housing, cast", qty: 8, bay: "A2", tone: "ok" },
  { sku: "Z619", name: "Drive belt, 1200mm", qty: 2, bay: "A3", tone: "low" },
  { sku: "TRN0442", name: "Coupler, stainless", qty: 16, bay: "A4", tone: "ok" },
  { sku: "KLM8891", name: "Gasket set, nitrile", qty: 40, bay: "B1", tone: "ok" },
  { sku: "QP2210", name: "Pressure valve, 3in", qty: 6, bay: "B2", tone: "ok" },
  { sku: "VX7735", name: "Shaft collar, 40mm", qty: 31, bay: "B3", tone: "ok" },
  { sku: "LX4423", name: "Seal kit, viton", qty: 3, bay: "C3", tone: "low" },
];

const PENDING = [
  { sku: "VX7735", who: "M. Haddad", qty: 31 },
  { sku: "HD1902", who: "J. Okonkwo", qty: 12 },
  { sku: "BRT5518", who: "M. Haddad", qty: 9 },
  { sku: "NW3067", who: "A. Silva", qty: 27 },
  { sku: "GG9081", who: "J. Okonkwo", qty: 18 },
];

const ORDERS = [
  { po: "PO-1043", supplier: "Northwind Supply", total: "$4,180", state: "Received" },
  { po: "PO-1044", supplier: "Delta Fasteners", total: "$960", state: "In transit" },
  { po: "PO-1045", supplier: "Kirkwall Rubber", total: "$2,310", state: "Draft" },
  { po: "PO-1046", supplier: "Ferris Bearings", total: "$1,725", state: "In transit" },
  { po: "PO-1047", supplier: "Northwind Supply", total: "$640", state: "Draft" },
];

const BARS = [42, 58, 35, 71, 64, 88, 76, 69];

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="conveyor-panel flex h-full w-[86vw] shrink-0 flex-col gap-4 sm:w-[64vw] lg:w-[46rem]">
      <figcaption className="font-display text-lg font-semibold tracking-tight">
        {label}
      </figcaption>
      <div className="grain relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
        {children}
      </div>
    </figure>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center gap-4 border-b border-border/70 px-5 last:border-0">
      {children}
    </div>
  );
}

export default function ProductRail() {
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((p: number) => {
    const rail = railRef.current;
    if (!rail) return;

    const distance = Math.max(0, rail.scrollWidth - window.innerWidth + 64);
    rail.style.transform = `translate3d(${-p * distance}px,0,0)`;

    /* Turn each panel by how far it sits from the centre of the viewport. */
    const mid = window.innerWidth / 2;
    for (const el of Array.from(rail.children) as HTMLElement[]) {
      const r = el.getBoundingClientRect();
      const ratio = (r.left + r.width / 2 - mid) / window.innerWidth;
      const clamped = Math.max(-1.1, Math.min(1.1, ratio));
      el.style.transform = `perspective(1700px) rotateY(${clamped * -22}deg) scale(${1 - Math.abs(clamped) * 0.1})`;
      el.style.opacity = String(Math.max(0.25, 1 - Math.abs(clamped) * 0.75));
    }
  }, []);

  useScrollScrub(trackRef, onProgress);

  return (
    <section aria-label="Inside Invems" className="border-t border-border">
      <div ref={trackRef} className="relative" style={{ height: "340vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div
            ref={railRef}
            className="conveyor flex h-[min(66vh,34rem)] gap-8 px-8 will-change-transform"
          >
            {/* Inventory */}
            <Panel label="Inventory">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <span className="text-sm font-semibold">Bay A to C</span>
                <span className="mono text-xs text-muted-foreground">8 of 1,284</span>
              </div>
              {STOCK.map((s) => (
                <Row key={s.sku}>
                  <span className="mono w-28 shrink-0 text-[13px] text-[var(--brand-1)]">{s.sku}</span>
                  <span className="flex-1 truncate text-sm">{s.name}</span>
                  <span className="mono text-[13px] text-muted-foreground">{s.bay}</span>
                  <span
                    className={`mono w-9 text-right text-[13px] font-semibold ${s.tone === "low" ? "text-warning" : ""}`}
                  >
                    {s.qty}
                  </span>
                </Row>
              ))}
            </Panel>

            {/* Approvals */}
            <Panel label="Approvals">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <span className="text-sm font-semibold">Waiting on you</span>
                <span className="flex items-center gap-2 rounded-full bg-[var(--brand-2)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--brand-2)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-2)] opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-2)]" />
                  </span>
                  5
                </span>
              </div>
              {PENDING.map((p) => (
                <Row key={p.sku}>
                  <span className="mono w-28 shrink-0 text-[13px] text-[var(--brand-1)]">{p.sku}</span>
                  <span className="flex-1 truncate text-sm text-muted-foreground">{p.who}</span>
                  <span className="mono text-[13px] font-semibold">+{p.qty}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <X className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </span>
                </Row>
              ))}
            </Panel>

            {/* Purchase orders */}
            <Panel label="Purchase orders">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <span className="text-sm font-semibold">Open</span>
                <span className="mono text-xs text-muted-foreground">5</span>
              </div>
              {ORDERS.map((o) => (
                <Row key={o.po}>
                  <span className="mono w-24 shrink-0 text-[13px] text-[var(--brand-1)]">{o.po}</span>
                  <span className="flex-1 truncate text-sm">{o.supplier}</span>
                  <span className="mono text-[13px] text-muted-foreground">{o.total}</span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {o.state}
                  </span>
                </Row>
              ))}
            </Panel>

            {/* Analytics */}
            <Panel label="Analytics">
              <div className="flex h-full flex-col p-7">
                <div className="flex items-baseline gap-3">
                  <span className="mono font-display text-4xl font-bold tabular-nums">1,284</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                    <TrendingUp className="h-4 w-4" /> units on hand
                  </span>
                </div>
                <div className="mt-auto flex h-44 items-end gap-2.5">
                  {BARS.map((h, i) => (
                    <span
                      key={i}
                      className="bar-breathe flex-1 rounded-t-sm bg-brand-gradient"
                      style={{ height: `${h}%`, "--delay": `${i * 0.19}s` } as React.CSSProperties}
                    />
                  ))}
                </div>
                <div className="mono mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>Mon</span>
                  <span>Sun</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}
