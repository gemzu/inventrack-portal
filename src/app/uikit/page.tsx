"use client";

/**
 * Console reference.
 *
 * An unlinked route that renders the dashboard's surfaces against fixed
 * numbers, so the console's look can be checked without a session and without
 * touching live data. It exists because everything it shows sits behind auth,
 * which made the working screens the one part of the product nobody could
 * review at a glance.
 *
 * Keep it honest: it must use the same components the dashboard uses, never a
 * copy of them, or it stops being a reference and becomes a second design.
 */

import Link from "next/link";
import { AnimatedNumber } from "@/components/motion/primitives";
import { Panel, Rule, Figure, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import Mark from "@/components/Mark";
import { ArrowUpRight } from "lucide-react";

const COUNT = [
  { label: "Units on hand", value: 1284, note: "across 3 sites" },
  { label: "Running low", value: 17, tone: "warning" as const, note: "2 or fewer left" },
  { label: "Orders placed", value: 342 },
  { label: "Waiting on you", value: 6, tone: "brand" as const },
  { label: "People", value: 24, note: "19 active" },
  { label: "Fulfilled", value: 96, suffix: "%" },
];

const COMPOSITION = [
  { name: "Available", value: 912 },
  { name: "Reserved", value: 244 },
  { name: "Sold", value: 128 },
];

const MOVING = [
  { buyer: "Harbour Supply Co.", lines: 8, status: "shipped", at: "Today 09:12" },
  { buyer: "Delmar Trading", lines: 3, status: "pending_approval", at: "Today 08:40" },
  { buyer: "Northline Parts", lines: 21, status: "delivered", at: "Yesterday 17:05" },
  { buyer: "Vantage Retail", lines: 2, status: "cancelled", at: "Yesterday 15:22" },
];

const SCANS = [
  { code: "019800702083", action: "receive", by: "amir", at: "09:14" },
  { code: "884906132119", action: "count", by: "rita", at: "09:02" },
  { code: "501234567890", action: "pick", by: "amir", at: "08:51" },
  { code: "400638133393", action: "transfer", by: "jo", at: "08:33" },
];

export default function ConsoleReference() {
  const total = COMPOSITION.reduce((n, c) => n + c.value, 0);

  return (
    <div className="console min-h-screen bg-background text-foreground">
      <div className="console-ground" aria-hidden />

      <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark className="h-6 w-6" />
            <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.02em]">
              Invems
            </span>
          </Link>
          <span className="mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Console reference
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageShell
          title="Overview"
          subtitle="Everything on the floor, as it stands this minute."
          eyebrow="Console"
          actions={
            <span className="mono inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2 text-[11px] uppercase tracking-[0.18em] transition-[border-color,color] duration-300 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]">
              Open inventory <ArrowUpRight className="h-3 w-3" />
            </span>
          }
        >
          <div className="space-y-12">
            <section className="space-y-5">
              <Rule index={1} label="The count" />
              <div className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-3">
                {COUNT.map((f) => (
                  <div key={f.label} className="bg-background p-5">
                    <Figure
                      label={f.label}
                      note={f.note}
                      tone={f.tone}
                      suffix={f.suffix}
                      value={<AnimatedNumber value={f.value} />}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <Rule index={2} label="Composition" />
              <div className="reveal panel p-6">
                <div className="flex items-end gap-6" style={{ height: "9rem" }}>
                  {COMPOSITION.map((c, i) => {
                    const pct = Math.round((c.value / total) * 100);
                    return (
                      <div key={c.name} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                        <p className="mono mb-2 text-[11px] tabular-nums text-[var(--brand-2)]">{pct}%</p>
                        <div
                          className="bar-breathe w-full rounded-sm"
                          style={{
                            height: `${Math.max(pct, 2)}%`,
                            background: `linear-gradient(to top, var(--brand-1), color-mix(in oklab, var(--brand-3) ${i * 30}%, var(--brand-2)))`,
                            ["--delay" as string]: `${i * 0.6}s`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-6 border-t border-border pt-4">
                  {COMPOSITION.map((c) => (
                    <div key={c.name} className="min-w-0 flex-1">
                      <ColHead className="block truncate">{c.name}</ColHead>
                      <p className="mono mt-1 text-sm font-semibold tabular-nums">{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid gap-12 lg:grid-cols-2">
              <section className="space-y-5">
                <Rule index={3} label="Moving" />
                <Panel className="reveal">
                  {MOVING.map((o) => (
                    <div key={o.buyer} className="row-line flex items-center justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{o.buyer}</p>
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {o.lines} lines · {o.at}
                        </p>
                      </div>
                      <Status status={o.status} className="shrink-0" />
                    </div>
                  ))}
                </Panel>
              </section>

              <section className="space-y-5">
                <Rule index={4} label="Scanned" />
                <Panel className="reveal d1">
                  {SCANS.map((l) => (
                    <div key={l.code} className="row-line flex items-center justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="mono truncate text-sm">{l.code}</p>
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {l.action} · {l.by}
                        </p>
                      </div>
                      <span className="mono shrink-0 text-[11px] text-muted-foreground">{l.at}</span>
                    </div>
                  ))}
                </Panel>
              </section>
            </div>

            <section className="space-y-5">
              <Rule index={5} label="Waiting" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <CrateSkeleton key={i} className="h-24 w-full" delay={i * 0.12} />
                ))}
              </div>
            </section>
          </div>
        </PageShell>
      </div>
    </div>
  );
}
