import Mark from "@/components/Mark";

/**
 * Full-page loader.
 *
 * Was a gradient blob behind a spinner ring, which is the look the rest of the
 * app has just moved away from. It now uses the same gesture as the site's
 * boot gate: the mark draws itself, holds, and clears, on a loop. No fill, no
 * ring, nothing that only exists to spin.
 */
export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Mark className="mark-draw h-20 w-20 text-[var(--brand-2)]" strokeWidth={16} />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
