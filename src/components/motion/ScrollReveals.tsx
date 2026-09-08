"use client";

/**
 * One IntersectionObserver for the whole page, not one per element.
 * Mount this once. It picks up anything carrying a .reveal* class,
 * adds .visible when it enters, then stops watching it.
 *
 * Everything it drives starts at opacity 0, so a stalled observer would leave
 * the page blank rather than merely unanimated. Two guards against that:
 *
 *  - IntersectionObserver callbacks are tied to the rendering pipeline, which
 *    browsers pause for hidden or backgrounded tabs. A re-scan on
 *    visibilitychange catches anything missed while the tab was away.
 *  - A one-shot failsafe reveals whatever is already in or above the viewport
 *    shortly after mount. Timers still run when the pipeline does not, so this
 *    holds even if the observer never delivers.
 */

import { useEffect } from "react";

const SELECTOR =
  ".reveal, .reveal-left, .reveal-right, .reveal-img, .reveal-line, .scan-text:not(.visible)";

const FAILSAFE_MS = 2500;

export default function ScrollReveals() {
  useEffect(() => {
    const all = () => Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      all().forEach((el) => el.classList.add("visible"));
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
      all().forEach((el) => {
        if (!el.classList.contains("visible")) observer.observe(el);
      });
    };

    scan();

    /* New nodes should animate too. */
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    /* Anything already reached must never stay invisible. */
    const sweep = () => {
      const limit = window.innerHeight * 1.15;
      all().forEach((el) => {
        if (el.classList.contains("visible")) return;
        if (el.getBoundingClientRect().top < limit) el.classList.add("visible");
      });
    };

    const failsafe = window.setTimeout(sweep, FAILSAFE_MS);

    /* Scroll backstop. Scroll events fire even where the rendering pipeline is
       paused, so this guarantees content below the fold can never stay at
       opacity 0 if the observer is not delivering. It removes itself once
       everything has been revealed, so the common path costs nothing. */
    const onScroll = () => {
      sweep();
      if (all().every((el) => el.classList.contains("visible"))) {
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scan();
        sweep();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.clearTimeout(failsafe);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
