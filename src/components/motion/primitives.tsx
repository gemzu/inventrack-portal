"use client";

/**
 * Entrances, for everything that is not the public landing page.
 *
 * These used to be Framer Motion: `useInView` per element, a spring, and a
 * lift on hover. The public site does none of that — it runs one shared
 * IntersectionObserver and a handful of CSS transitions on `.reveal`, with a
 * 55ms step and ease-out-expo. Two systems meant the dashboard visibly moved
 * differently from the site even where the layouts matched.
 *
 * So these keep their names and their props, and now render the site's own
 * classes. Every screen that already imports them gets the site's motion
 * without being touched, and there is one motion system left instead of two.
 *
 * The observer that drives them is mounted once in the root layout.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* 55ms steps, matching the index links. Beyond seven, entrances stop reading
   as a sequence and start reading as a delay, so the step is capped. */
const STEP = 0.055;
const stepClass = (i: number) => `d${Math.min(Math.max(i, 0), 7)}`;

/* Reveal on scroll into view. `delay` stays in seconds for compatibility with
   the old call sites and is snapped onto the shared 55ms grid. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Accepted and ignored: the distance is fixed by the shared system now. */
  y?: number;
  once?: boolean;
}) {
  const step = Math.round(delay / STEP);
  return <div className={cn("reveal", step > 0 && stepClass(step), className)}>{children}</div>;
}

/* Group whose children arrive one after another. The stagger is applied by
   the child index rather than by a parent orchestrator, so it survives the
   children being anything at all. */
export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
}) {
  const base = Math.round(delay / STEP);
  return (
    <div className={className} data-stagger={base || undefined}>
      {children}
    </div>
  );
}

/* Child of a Stagger. Reads its own position so the step is right without the
   parent having to clone anything. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return;
    const index = Array.prototype.indexOf.call(el.parentElement.children, el);
    const base = Number(el.parentElement.getAttribute("data-stagger") || 0);
    setStep(index + base);
  }, []);

  return (
    <div ref={ref} className={cn("reveal", step > 0 && stepClass(step), className)}>
      {children}
    </div>
  );
}

/* The console surface. Kept under its old name because thirty screens import
   it, but it is the site's hairline panel now: no glass, no blur, no drop
   shadow, one edge that lights. */
export function MotionCard({
  children,
  className,
  interactive = true,
  glow = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  /** Now means "this one is the point of the screen" — it keeps its edge lit. */
  glow?: boolean;
} & React.ComponentProps<"div">) {
  return (
    <div
      className={cn("panel", glow && "panel-live", interactive && "panel-hover", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* Count-up. The spring came from Framer; this is the same gesture on a
   requestAnimationFrame with the site's expo easing, which is what every
   other timing on the site uses. */
export function AnimatedNumber({
  value,
  className,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 900,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      /* expoOut, the curve behind --ease-out-expo. */
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setShown(a + (b - a) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = b;
    };
  }, [value, duration]);

  return <span className={cn("tabular-nums", className)}>{format(shown)}</span>;
}
