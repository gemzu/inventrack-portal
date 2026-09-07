"use client";

/**
 * Scroll scrubbing without cached positions.
 *
 * GSAP ScrollTrigger measures start/end once and caches them. Under Next's
 * hydration, with fonts still loading and several viewport-height sections
 * above the fold, those measurements were stale here and onUpdate never fired.
 * Refreshing on rAF and on fonts.ready did not fix it reliably.
 *
 * Measuring the element every frame instead removes that whole class of bug.
 * It is one passive scroll listener and one rAF, reading a rect that the
 * browser already has, so it is cheap.
 *
 * Pairs with `position: sticky` for the pinning, so there is no pin-spacer.
 */

import { useEffect, useRef, type RefObject } from "react";

export function useScrollScrub(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  onReducedMotion?: () => void
) {
  /* Hold the latest callbacks so changing them never re-subscribes. */
  const progressRef = useRef(onProgress);
  const reducedRef = useRef(onReducedMotion);
  progressRef.current = onProgress;
  reducedRef.current = onReducedMotion;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reducedRef.current?.();
      return;
    }

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = el.offsetHeight - window.innerHeight;
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
      progressRef.current(p);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
