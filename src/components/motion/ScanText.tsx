"use client";

/**
 * Text that resolves the way a scanned bay does: character by character, left
 * to right, out of a blur. The stagger is the same gesture the wall makes, so
 * the type reads as part of the product rather than a decorative effect.
 *
 * Gradient handling: splitting a background-clip:text element into transformed
 * child spans breaks the clip, so gradient lines colour each character along
 * the brand ramp instead. Same look, and it survives per-character animation.
 */

import { useEffect, useRef, useState } from "react";

export default function ScanText({
  text,
  gradient = false,
  immediate = false,
  delay = 0,
  step = 0.022,
  className = "",
  as: Tag = "span",
}: {
  text: string;
  /** Colour characters along brand-1 → brand-3 instead of inheriting. */
  gradient?: boolean;
  /** Animate on mount rather than waiting to scroll into view. */
  immediate?: boolean;
  delay?: number;
  step?: number;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);

  /* Render plain text until mounted so SSR output stays readable and no
     character flash happens before hydration. */
  useEffect(() => setReady(true), []);

  const words = text.split(" ");
  let index = 0;
  const total = text.length;

  return (
    <Tag
      ref={ref as never}
      aria-label={text}
      className={`scan-text ${immediate && ready ? "visible" : ""} ${className}`}
    >
      {ready
        ? words.map((word, w) => (
            <span key={`${word}-${w}`} className="inline-block whitespace-nowrap">
              {[...word].map((ch, c) => {
                const i = index++;
                const ramp = total > 1 ? i / (total - 1) : 0;
                return (
                  <span
                    key={c}
                    aria-hidden
                    className="scan-ch"
                    style={{
                      animationDelay: `${delay + i * step}s`,
                      ...(gradient
                        ? {
                            color: `color-mix(in oklab, var(--brand-3) ${Math.round(ramp * 100)}%, var(--brand-1))`,
                          }
                        : null),
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
              {w < words.length - 1 ? (
                <span aria-hidden className="scan-ch" style={{ animationDelay: `${delay + index++ * step}s` }}>
                  {" "}
                </span>
              ) : null}
            </span>
          ))
        : text}
    </Tag>
  );
}
