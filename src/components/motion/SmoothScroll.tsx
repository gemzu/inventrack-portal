"use client";

/**
 * Smoothed scrolling, for the landing page only.
 *
 * The page is built around scroll: the hero's crate field, the conveyor's
 * per-frame transforms, the reveals. Native wheel scrolling arrives in coarse
 * jumps — three or four notches at a time on most mice — so all of that motion
 * is sampled at whatever position the jump landed on, and reads as steppy no
 * matter how carefully the easing is written. Damping the scroll position is
 * what makes the rest of the motion look considered.
 *
 * Three deliberate limits, because taking over scrolling is a real cost:
 *
 *  - Touch is left completely alone. Native momentum on a phone is better than
 *    anything reimplemented on top of it, and hijacking it breaks the address
 *    bar collapsing and the overscroll bounce.
 *  - Anyone who has asked for less motion gets the browser's own scrolling.
 *  - It runs on the landing page and nowhere else. Working screens should
 *    scroll the instant you ask them to; a shipment list is not a place for
 *    inertia.
 *
 * Lenis scrolls the real window rather than transforming a wrapper, so
 * IntersectionObserver, getBoundingClientRect, sticky positioning and anchor
 * links all keep working — which is the reason for using it over a hand-rolled
 * transform, where every one of those breaks.
 */

import { useEffect } from "react";

export default function SmoothScroll() {
  useEffect(() => {
    const wantsLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (wantsLessMotion || isTouch) return;

    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let frame = 0;
    let cancelled = false;

    /* Loaded on demand so the landing page's first paint does not wait on it,
       and so no other route ever pays for it. */
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;

      lenis = new Lenis({
        /* About a fifth of a second of catch-up. Long enough to smooth the
           notches out, short enough that the page still feels attached to the
           wheel rather than sliding around after it. */
        lerp: 0.11,
        wheelMultiplier: 1,
        /* Trackpads already send smooth deltas; smoothing them again is what
           makes a site feel like it is fighting you. */
        syncTouch: false,
      });

      const tick = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);

  return null;
}
