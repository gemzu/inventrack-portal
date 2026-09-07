"use client";

/**
 * Damped scroll scrubbing.
 *
 * Mapping scroll position straight to progress tracks the wheel exactly, which
 * reads as jerky. This eases a current value toward the measured target every
 * frame instead, which is what GSAP's `scrub: <seconds>` does and why its
 * output feels smooth.
 *
 * The rAF loop only runs while the two values differ, so an idle page costs
 * nothing.
 *
 * Callers must animate composited properties only (transform, opacity).
 * Anything that repaints per frame, mask-size especially, will stutter no
 * matter how well damped the input is.
 */

import { useEffect, useRef, type RefObject } from "react";

export function useScrollScrub(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  onReducedMotion?: () => void,
  /* 0 to 1. Lower is heavier. 0.14 lands close to scrub: 1. */
  damping = 0.14
) {
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
    let current = -1;
    let target = 0;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const travel = el.offsetHeight - window.innerHeight;
      target = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
    };

    const tick = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.0004) {
        current = target;
        progressRef.current(current);
        frame = 0;
        return;
      }
      current += delta * damping;
      progressRef.current(current);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      measure();
      if (current < 0) current = target; /* No slide-in on first paint. */
      if (!frame) frame = requestAnimationFrame(tick);
    };

    start();
    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("resize", start);

    return () => {
      window.removeEventListener("scroll", start);
      window.removeEventListener("resize", start);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, damping]);
}
