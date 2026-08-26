"use client";

/**
 * Kinetic Ink motion primitives — the building blocks every screen composes.
 * Reveal / Stagger for entrances, AnimatedNumber for count-ups, MotionCard
 * for the signature liftable glass surface.
 */
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fadeUp, stagger, staggerItem, spring, hoverLift } from "@/lib/motion";

/* Reveal on scroll-into-view (or immediately if already visible). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { ...spring, delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/* Group that staggers its direct <Stagger.Item> children into view. */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.06,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={stagger(delay, gap)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/* Signature surface: glassy card that lifts + glows on hover. */
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
  glow?: boolean;
} & React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      variants={staggerItem}
      {...(interactive ? hoverLift : {})}
      className={cn(
        "relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl",
        "ring-1 ring-inset ring-white/[0.04] transition-shadow",
        glow ? "shadow-glow" : "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.25)]",
        interactive && "hover:shadow-glow cursor-default",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* Count-up number that springs to its target when mounted / value changes. */
export function AnimatedNumber({
  value,
  className,
  format = (n) => Math.round(n).toLocaleString(),
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const mv = useMotionValue(0);
  const sv = useSpring(mv, { stiffness: 90, damping: 20, mass: 1 });
  const text = useTransform(sv, (n) => format(n));
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}
