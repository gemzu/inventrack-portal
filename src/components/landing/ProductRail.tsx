"use client";

/**
 * The product rail.
 *
 * Four real surfaces from the app, moved past the viewport on scroll. No
 * explanatory prose: the screens are the argument, and each carries a two word
 * label so you know what you are looking at.
 *
 * Only the rail's transform is animated, so the whole thing stays on the
 * compositor. CSS sticky does the pinning.
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
];

const PENDING = [
  { sku: "VX7735", who: "M. Haddad", qty: 31 },
  { sku: "HD1902", who: "J. Okonkwo", qty: 12 },
  { sku: "BRT5518", who: "M. Haddad", qty: 9 },
];

const ORDERS = [
  { po: "PO-1043", supplier: "Northwind Supply", total: "$4,180", state: "Received" },
  { po: "PO-1044", supplier: "Delta Fasteners", total: "$960", state: "In transit" },
  { po: "PO-1045", supplier: "Kirkwall Rubber", total: "$2,310", state: "Draft" },
];

const BARS = [42, 58, 35, 71, 64, 88, 76];

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex h-full w-[86vw] shrink-0 flex-col gap-3 sm:w-[62vw] lg:w-[44rem]">
      <figcaption className="mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </figcaption>
      <div className="grain relative flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
        {children}
      </div>
    </figure>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/70 px-4 py-2.5 last:border-0">
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
  }, []);

  useScrollScrub(trackRef, onProgress);

  return (
    <section aria-label="Inside Invems" className="border-t border-border">
      <div ref={trackRef} className="relative" style={{ height: "340vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div
            ref={railRef}
            className="flex h-[min(64vh,32rem)] gap-6 px-8 will-change-transform"
          >
            {/* Inventory */}
            <Panel label="Inventory">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-xs font-semibold">Bay A to B</span>
                <span className="mono text-[10px] text-muted-foreground">5 of 1,284</span>
              </div>
              {STOCK.map((s) => (
                <Row key={s.sku}>
                  <span className="mono w-24 shrink-0 text-[11px] text-[var(--brand-1)]">{s.sku}</span>
                  <span className="flex-1 truncate text-xs">{s.name}</span>
                  <span className="mono text-[11px] text-muted-foreground">{s.bay}</span>
                  <span
                    className={`mono w-8 text-right text-[11px] ${s.tone === "low" ? "text-warning" : ""}`}
                  >
                    {s.qty}
                  </span>
                </Row>
              ))}
            </Panel>

            {/* Approvals */}
            <Panel label="Approvals">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-xs font-semibold">Waiting on you</span>
                <span className="rounded-full bg-[var(--brand-2)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-2)]">
                  3
                </span>
              </div>
              {PENDING.map((p) => (
                <Row key={p.sku}>
                  <span className="mono w-24 shrink-0 text-[11px] text-[var(--brand-1)]">{p.sku}</span>
                  <span className="flex-1 truncate text-xs text-muted-foreground">{p.who}</span>
                  <span className="mono text-[11px]">+{p.qty}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-success">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <X className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </span>
                </Row>
              ))}
            </Panel>

            {/* Purchase orders */}
            <Panel label="Purchase orders">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-xs font-semibold">Open</span>
                <span className="mono text-[10px] text-muted-foreground">3</span>
              </div>
              {ORDERS.map((o) => (
                <Row key={o.po}>
                  <span className="mono w-20 shrink-0 text-[11px] text-[var(--brand-1)]">{o.po}</span>
                  <span className="flex-1 truncate text-xs">{o.supplier}</span>
                  <span className="mono text-[11px] text-muted-foreground">{o.total}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {o.state}
                  </span>
                </Row>
              ))}
            </Panel>

            {/* Analytics */}
            <Panel label="Analytics">
              <div className="flex h-full flex-col p-5">
                <div className="flex items-baseline gap-2">
                  <span className="mono font-display text-3xl font-extrabold tabular-nums">1,284</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                    <TrendingUp className="h-3 w-3" /> units on hand
                  </span>
                </div>
                <div className="mt-auto flex h-32 items-end gap-2">
                  {BARS.map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-t-sm bg-brand-gradient"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mono mt-2 flex justify-between text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
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
