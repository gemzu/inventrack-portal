"use client";

/**
 * A number that keeps moving, because stock does.
 *
 * Starts at a fixed value so the server and client render the same markup,
 * then drifts upward after mount. Small, irregular steps read as real activity;
 * a smooth counter reads as an odometer gimmick.
 */

import { useEffect, useState } from "react";

export default function LiveCount({
  from = 1284,
  className = "",
}: {
  from?: number;
  className?: string;
}) {
  const [n, setN] = useState(from);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;

    const bump = () => {
      if (!alive) return;
      setN((v) => v + 1 + Math.floor(Math.random() * 3));
      /* Irregular gaps so it never feels metronomic. */
      window.setTimeout(bump, 2600 + Math.random() * 3200);
    };

    const id = window.setTimeout(bump, 2200);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, []);

  return (
    <span className={`tabular-nums ${className}`} suppressHydrationWarning>
      {n.toLocaleString("en-US")}
    </span>
  );
}
