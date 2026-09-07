"use client";

/**
 * One IntersectionObserver for the whole page, not one per element.
 * Mount this once. It picks up anything carrying a .reveal* class,
 * adds .visible when it enters, then stops watching it.
 *
 * Re-scans on route change and whenever new nodes appear, so sections
 * rendered later still animate.
 */

import { useEffect } from "react";

const SELECTOR = ".reveal, .reveal-left, .reveal-right, .reveal-img";

export default function ScrollReveals() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains("visible")) observer.observe(el);
      });
    };

    scan();

    /* Anything above the fold on load should not wait for a scroll event. */
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
