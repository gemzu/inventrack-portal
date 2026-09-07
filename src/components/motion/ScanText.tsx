"use client";

/**
 * Text that comes into focus rather than fading up.
 *
 * Each character arrives soft and split into a violet/cyan fringe, then pulls
 * sharp as the sweep reaches it: a lens finding focus, which is the same act
 * the scanner performs on a bay. A plain staggered fade is the default effect
 * on every site; this is the product's own gesture.
 *
 * Two details make it read as considered rather than mechanical:
 *  - The stagger is eased, not linear, so the sweep accelerates across a line.
 *  - Timing is normalised by line length, so a long line and a short one take
 *    the same time. Per-character delays make long lines crawl.
 *
 * Gradient lines colour each character along the brand ramp, because splitting
 * a background-clip:text element into transformed spans breaks the clip.
 */

import { useEffect, useState } from "react";

export default function ScanText({
  text,
  gradient = false,
  immediate = false,
  delay = 0,
  /** Seconds for the sweep to cross the whole line, whatever its length. */
  span = 0.5,
  className = "",
  as: Tag = "span",
}: {
  text: string;
  gradient?: boolean;
  immediate?: boolean;
  delay?: number;
  span?: number;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const words = text.split(" ");
  const total = text.length;
  let index = 0;

  const charStyle = (i: number) => {
    const t = total > 1 ? i / (total - 1) : 0;
    /* Eased stagger: quick at the start, easing out across the line. */
    return `${(delay + Math.pow(t, 0.72) * span).toFixed(3)}s`;
  };

  const rampColor = (i: number) => {
    const t = total > 1 ? i / (total - 1) : 0;
    return `color-mix(in oklab, var(--brand-3) ${Math.round(t * 100)}%, var(--brand-1))`;
  };

  return (
    <Tag
      aria-label={text}
      className={`scan-text ${immediate && ready ? "visible" : ""} ${className}`}
    >
      {ready
        ? words.map((word, w) => (
            <span key={`${word}-${w}`} className="inline-block whitespace-nowrap">
              {[...word].map((ch, c) => {
                const i = index++;
                return (
                  <span
                    key={c}
                    aria-hidden
                    className="scan-ch"
                    style={{
                      animationDelay: charStyle(i),
                      ...(gradient ? { color: rampColor(i) } : null),
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
              {w < words.length - 1 ? (
                <span
                  aria-hidden
                  className="scan-ch"
                  style={{ animationDelay: charStyle(index++) }}
                >
                  {" "}
                </span>
              ) : null}
            </span>
          ))
        : text}
    </Tag>
  );
}
