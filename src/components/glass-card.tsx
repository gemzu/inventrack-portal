"use client";

/**
 * There is no glass any more.
 *
 * This was a blurred, semi-transparent card — the surface the console dropped,
 * because it appears nowhere on the public site and it is the reason panels
 * used to read as floating chrome rather than as structure. Four screens still
 * ask for it by name, so it stays as a thin alias over the panel instead of
 * being deleted out from under them.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function GlassCard({
  className,
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={cn("panel p-6", className)}>
      {children}
    </div>
  );
}
