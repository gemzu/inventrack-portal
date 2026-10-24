"use client";

/**
 * Billed vs received, month by month. Two series, one axis from zero, thin
 * bars with a 2px gap, a legend, a hover readout per month, and the same
 * numbers as a table for anyone who would rather read than look.
 * Colours checked with the dataviz palette validator (light and dark).
 */

import { useMemo, useState } from "react";
import { fmtMoney } from "@/lib/sales";

type Row = { month: string; billed: number; received: number; invoices: number };

const BILLED = "fill-[#6d4af0] dark:fill-[#8670f4]";
const RECEIVED = "fill-[#0f8fa6] dark:fill-[#23a3b8]";
const SWATCH_B = "bg-[#6d4af0] dark:bg-[#8670f4]";
const SWATCH_R = "bg-[#0f8fa6] dark:bg-[#23a3b8]";

const monthLabel = (ym: string, long = false) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", long ? { month: "long", year: "numeric" } : { month: "short" });
};

/* A round top for the axis: 1, 2 or 5 times a power of ten. */
function niceMax(v: number) {
  if (v <= 0) return 100_00;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p;
  return 10 * p;
}
const short = (cents: number) => {
  const d = cents / 100;
  return d >= 1_000_000 ? `$${(d / 1_000_000).toFixed(d % 1_000_000 ? 1 : 0)}M` : d >= 1000 ? `$${(d / 1000).toFixed(d % 1000 ? 1 : 0)}k` : `$${d.toFixed(0)}`;
};

export default function MonthBars({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const W = 720, H = 240, L = 52, R = 8, T = 12, B = 28;
  const max = useMemo(() => niceMax(Math.max(0, ...rows.flatMap((r) => [r.billed, r.received]))), [rows]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const slot = (W - L - R) / Math.max(rows.length, 1);
  const bar = Math.max(3, Math.min(18, (slot - 10) / 2));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const every = rows.length > 13 ? Math.ceil(rows.length / 12) : 1;
  const h = hover != null ? rows[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${SWATCH_B}`} /> Billed (by invoice date)</span>
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${SWATCH_R}`} /> Received (by payment date)</span>
        <button onClick={() => setAsTable(!asTable)} className="ml-auto text-[12px] font-medium text-[var(--brand-2)] hover:underline">
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-medium">Month</th><th className="py-2 text-right font-medium">Invoices</th>
              <th className="py-2 text-right font-medium">Billed</th><th className="py-2 text-right font-medium">Received</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-border/60">
                  <td className="py-2">{monthLabel(r.month, true)}</td>
                  <td className="mono py-2 text-right tabular-nums">{r.invoices}</td>
                  <td className="mono py-2 text-right tabular-nums">{fmtMoney(r.billed)}</td>
                  <td className="mono py-2 text-right tabular-nums">{fmtMoney(r.received)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
            aria-label={`Billed and received by month, ${rows.length} months. Use "Show as table" for the numbers.`}
            onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={t === 0 ? 1 : 0.6} strokeDasharray={t === 0 ? undefined : "2 4"} />
                <text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">{short(t)}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = L + slot * i + slot / 2;
              const on = hover === i;
              return (
                <g key={r.month} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
                  aria-label={`${monthLabel(r.month, true)}: billed ${fmtMoney(r.billed)}, received ${fmtMoney(r.received)}`}>
                  {on ? <rect x={L + slot * i + 1} y={T} width={slot - 2} height={H - T - B} className="fill-muted" rx={4} /> : null}
                  {/* Round ends on the data end only, anchored to the baseline. */}
                  <path d={barPath(cx - bar - 1, y(r.billed), bar, y(0) - y(r.billed))} className={BILLED} />
                  <path d={barPath(cx + 1, y(r.received), bar, y(0) - y(r.received))} className={RECEIVED} />
                  {i % every === 0 ? (
                    <text x={cx} y={H - 9} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">{monthLabel(r.month)}</text>
                  ) : null}
                  <rect x={L + slot * i} y={T} width={slot} height={H - T - B + 20} fill="transparent" />
                </g>
              );
            })}
          </svg>
          {h ? (
            <div role="status" className="pointer-events-none absolute top-0 rounded-md border border-border bg-background/95 px-3 py-2 text-[12px] shadow-lg backdrop-blur"
              style={{ left: `clamp(0px, calc(${((L + slot * (hover! + 0.5)) / W) * 100}% - 80px), calc(100% - 170px))` }}>
              <p className="mb-1 font-semibold">{monthLabel(h.month, true)}</p>
              <p className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${SWATCH_B}`} />Billed</span><span className="mono tabular-nums">{fmtMoney(h.billed)}</span></p>
              <p className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${SWATCH_R}`} />Received</span><span className="mono tabular-nums">{fmtMoney(h.received)}</span></p>
              <p className="mt-1 text-muted-foreground">{h.invoices} invoice{h.invoices === 1 ? "" : "s"}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function barPath(x: number, top: number, w: number, h: number) {
  if (h <= 0.5) return "";
  const r = Math.min(4, w / 2, h);
  const b = top + h;
  return `M${x},${b} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${b} Z`;
}
