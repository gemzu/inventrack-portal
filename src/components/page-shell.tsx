"use client";

/**
 * The head of every console screen.
 *
 * Twenty-six pages render through here, so this file is most of what the
 * dashboard looks like. It used to be a Framer fade holding a 30px semibold
 * heading — the same header every admin template has.
 *
 * It now uses the site's own gesture: the title pulls into focus character by
 * character, the way the hero headline does, because that focus pull is the
 * scanner's act and it is the one piece of motion this product owns. Under it,
 * a hairline. No card, no shadow, no coloured strip.
 *
 * Titles are set in the display face at real size and in caps, which is how
 * they read on the public site. Anything longer than a few words is left in
 * sentence case by the caller.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import ScanText from "@/components/motion/ScanText";

export default function PageShell({
  title,
  subtitle,
  actions,
  breadcrumb,
  /** A word above the title, only where it says something the title does not.
      It defaulted to "Console" and so appeared, identically, on every page in
      the console — a label that told you where you already knew you were. */
  eyebrow,
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  eyebrow?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {(title || actions) && (
        <header className="space-y-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {eyebrow}
                </p>
              )}

              {/* A string gets the focus pull. A node is trusted as-is, since
                  splitting arbitrary children into per-character spans would
                  break anything with its own markup. */}
              {typeof title === "string" ? (
                <ScanText
                  as="h1"
                  text={title}
                  immediate
                  span={0.42}
                  delay={0.06}
                  className="font-display mt-2 block text-[1.7rem] font-bold uppercase leading-[1.05] tracking-[-0.03em] sm:text-[2.2rem]"
                />
              ) : (
                <h1 className="font-display mt-2 text-[1.7rem] font-bold uppercase leading-[1.05] tracking-[-0.03em] sm:text-[2.2rem]">
                  {title}
                </h1>
              )}

              {subtitle && (
                <p className="reveal d1 mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              )}

              {breadcrumb && (
                <div className="mt-3 text-[12px] text-muted-foreground">
                  {breadcrumb}
                </div>
              )}
            </div>

            {actions && (
              <div className="reveal d2 flex shrink-0 flex-wrap items-center gap-2.5">
                {actions}
              </div>
            )}
          </div>

          <div className="h-px w-full bg-border" />
        </header>
      )}

      {children}
    </div>
  );
}
