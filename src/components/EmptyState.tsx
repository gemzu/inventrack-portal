"use client";

/**
 * Nothing here yet.
 *
 * Every list on the dashboard falls through to this, so it was one of the most
 * visible pieces of the old look: a 20-square rounded tile with a tinted glow
 * behind a big violet icon, springing in on Framer.
 *
 * An empty screen should say what is missing, not decorate the absence. So:
 * the mark drawn as an outline the way the boot gate draws it, one line
 * naming what is not there, one line saying how it gets there. The icon the
 * caller passes is kept, at glyph size beside the mono caption, because it
 * still helps identify which list you are looking at.
 */

import type { LucideIcon } from "lucide-react";
import Mark from "@/components/Mark";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="reveal flex flex-col items-center justify-center px-6 py-20 text-center">
      <Mark className="h-10 w-10 text-[color-mix(in_oklab,var(--brand-2)_45%,transparent)]" strokeWidth={14} />

      <p className="mono mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        Empty
      </p>

      <h3 className="font-display mt-3 text-[15px] font-bold uppercase tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
