"use client";

/**
 * BOOT GATE — the page arrives the way the index does.
 *
 * The header's index opens as a bay door: layered slats moving in sequence on
 * ease-in-out-q. First load uses that identical gesture, so the very first
 * thing a visitor sees is already the site's motion language.
 *
 * The mark draws itself first, cube by cube, using the logo's real paths with
 * pathLength normalised to 1 so the stroke reveals evenly whatever its true
 * length. Then the door lifts.
 *
 * Shown once per session: a gate on every navigation stops being an entrance
 * and becomes an obstacle.
 */

import { useEffect, useState } from "react";

/* Straight from public/logo.svg. Order is draw order: top crate, then the
   two it rests on. */
const CUBES = [
  [
    "M256 108 L320 145 L320 219 L256 256 L192 219 L192 145 Z",
    "M256 182 L256 108 M256 182 L320 219 M256 182 L192 219",
  ],
  [
    "M188 242 L252 279 L252 353 L188 390 L124 353 L124 279 Z",
    "M188 316 L188 242 M188 316 L252 353 M188 316 L124 353",
  ],
  [
    "M324 242 L388 279 L388 353 L324 390 L260 353 L260 279 Z",
    "M324 316 L324 242 M324 316 L388 353 M324 316 L260 353",
  ],
];

const SESSION_KEY = "invems-booted";
const DRAW_MS = 1250;
const OPEN_MS = 900;

export default function BootGate() {
  const [state, setState] = useState<"idle" | "drawing" | "opening" | "gone">("idle");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* Private mode can throw on access; treat it as unseen. */
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      setState("gone");
      return;
    }

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* Not worth failing the boot over. */
    }

    setState("drawing");
    document.body.style.overflow = "hidden";

    const toOpen = window.setTimeout(() => setState("opening"), DRAW_MS);
    const toGone = window.setTimeout(() => setState("gone"), DRAW_MS + OPEN_MS);

    return () => {
      window.clearTimeout(toOpen);
      window.clearTimeout(toGone);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (state === "gone") document.body.style.overflow = "";
  }, [state]);

  if (state === "gone" || state === "idle") return null;

  const open = state === "opening";

  return (
    <div className="boot-gate" data-open={open} aria-hidden>
      {/* Same three slats as the index door. */}
      <span className="boot-slat" style={{ transitionDelay: open ? "160ms" : "0ms" }} />
      <span className="boot-slat" style={{ transitionDelay: open ? "80ms" : "0ms" }} />
      <span className="boot-slat" style={{ transitionDelay: open ? "0ms" : "0ms" }} />

      <div className="boot-mark">
        <svg viewBox="0 0 512 512" fill="none" className="h-28 w-28 sm:h-32 sm:w-32">
          <g
            className="boot-draw"
            stroke="var(--brand-2)"
            strokeWidth={14}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {CUBES.map((cube, c) =>
              cube.map((d, p) => (
                <path
                  key={`${c}-${p}`}
                  d={d}
                  pathLength={1}
                  style={{ animationDelay: `${c * 0.17 + p * 0.09}s` }}
                />
              ))
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
