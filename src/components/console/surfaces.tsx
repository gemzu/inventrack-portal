"use client";

/**
 * The console's surfaces.
 *
 * There is one box (Panel), one way to print a number (Figure), and one way to
 * start a section (Rule). The old dashboard had a Card, a MotionCard, a
 * card-luxury class and a handful of inline divs, all with different radii and
 * shadows, which is most of why it read as a different product from the site.
 *
 * Nothing here animates itself. Entrances come from the shared .reveal system
 * the public site uses, so a panel on the dashboard arrives exactly the way a
 * section on the landing page does.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Panel ─────────────────────────────────────────────────────
   A hairline box. `live` keeps its top edge lit, for the one thing
   on a screen that is currently the point. `href` makes the whole
   panel a destination and turns on the hover rise. */
export function Panel({
  children,
  className,
  live = false,
  href,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  live?: boolean;
  href?: string;
  interactive?: boolean;
}) {
  const hover = interactive ?? Boolean(href);
  const box = (
    <div
      className={cn(
        "panel overflow-hidden",
        live && "panel-live",
        hover && "panel-hover",
        className
      )}
    >
      {children}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {box}
    </Link>
  ) : (
    box
  );
}

/* ── Rule ──────────────────────────────────────────────────────
   Sections are announced by a hairline with an ordinal and a name,
   the way the index numbers its destinations. No card header, no
   icon in a rounded square. */
export function Rule({
  index,
  label,
  action,
  className,
}: {
  index: number;
  label: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("console-rule", className)}>
      <span className="mono text-[11px] tracking-[0.18em] text-[var(--brand-2)]">
        {String(index).padStart(2, "0")}
      </span>
      <span className="font-display text-[13px] font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="console-rule__line" />
      {action}
    </div>
  );
}

/* ── Figure ────────────────────────────────────────────────────
   A number, set large in the display face, with a mono caption
   under it. The number is the whole tile: no icon, no chip, no
   coloured background. */
export function Figure({
  label,
  value,
  suffix,
  note,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  note?: string;
  /** Only for figures that actually mean something is wrong. */
  tone?: "warning" | "destructive" | "brand";
  className?: string;
}) {
  const color =
    tone === "warning"
      ? "text-warning"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "brand"
          ? "text-[var(--brand-2)]"
          : "";
  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("figure-value truncate", color)}>
        {value}
        {suffix ? <span className="text-[0.5em] align-super">{suffix}</span> : null}
      </p>
      <p className="figure-label mt-2 truncate">{label}</p>
      {note ? <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/* ── Column head ───────────────────────────────────────────────
   Table headings are mono and quiet; the data is what should be
   loud. */
export function ColHead({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("col-head", className)}>{children}</span>;
}

/* ── Skeleton ──────────────────────────────────────────────────
   Loading draws empty crates with a light passing over them,
   which is the same sweep the boot gate uses. Grey blocks would
   have been a different product's idea of waiting. */
export function CrateSkeleton({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("crate-skeleton", className)}
      style={{ ["--d" as string]: `${delay}s` }}
    />
  );
}

/* ── List loading ──────────────────────────────────────────────
   Seven screens each drew their own spinner in the middle of an
   empty box. A spinner says only "wait"; empty crates say what is
   about to be there, and they hold the layout still while it
   arrives. */
export function ListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <CrateSkeleton key={i} className="h-14 w-full" delay={i * 0.06} />
      ))}
    </div>
  );
}
