"use client";

/**
 * A continuous strip of floor events between sections.
 *
 * The point is ambient life: something on the page is always moving, and it is
 * the product's own vocabulary rather than a decorative marquee. Track is
 * duplicated and translated by exactly -50%, so the loop has no seam.
 */

const EVENTS = [
  { tag: "SCAN", body: "PGD1668M · BAY A1 · +24" },
  { tag: "APPROVED", body: "MX1473 · +8" },
  { tag: "LOW", body: "Z619 · 2 REMAINING", tone: "warn" },
  { tag: "SCAN", body: "KLM8891 · BAY B1 · +40" },
  { tag: "ORDER", body: "PO-1044 · IN TRANSIT" },
  { tag: "SCAN", body: "VX7735 · BAY B3 · +31" },
  { tag: "SYNCED", body: "10 QUEUED · 0 FAILED", tone: "ok" },
  { tag: "APPROVED", body: "HD1902 · +12" },
  { tag: "SCAN", body: "TRN0442 · BAY A4 · +16" },
  { tag: "RECEIVED", body: "PO-1043 · NORTHWIND SUPPLY", tone: "ok" },
  { tag: "LOW", body: "LX4423 · 3 REMAINING", tone: "warn" },
  { tag: "SCAN", body: "NW3067 · BAY C2 · +27" },
];

function Run({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {EVENTS.map((e, i) => (
        <span key={i} className="flex items-center gap-2.5 px-6">
          <span
            className={`mono text-[10px] font-bold tracking-[0.16em] ${
              e.tone === "warn"
                ? "text-warning"
                : e.tone === "ok"
                  ? "text-success"
                  : "text-[var(--brand-2)]"
            }`}
          >
            {e.tag}
          </span>
          <span className="mono whitespace-nowrap text-[10px] tracking-[0.14em] text-muted-foreground">
            {e.body}
          </span>
          <span className="text-border">/</span>
        </span>
      ))}
    </div>
  );
}

export default function EventTicker() {
  return (
    <div className="ticker-strip relative overflow-hidden border-y border-border bg-card/30 py-3">
      <div className="ticker-track flex w-max">
        <Run />
        <Run ariaHidden />
      </div>
    </div>
  );
}
