/**
 * Waiting, in the console's own language.
 *
 * Grey rounded blocks were a stand-in for a card layout that no longer exists.
 * These are empty crates on the same hairline grid the loaded page uses, with
 * the boot gate's light passing over them, so the wait looks like the product
 * rather than like a placeholder library.
 */

import { CrateSkeleton } from "@/components/console/surfaces";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <CrateSkeleton className="h-3 w-20 border-0" />
        <CrateSkeleton className="h-10 w-64 border-0" delay={0.05} />
        <CrateSkeleton className="h-3 w-80 border-0" delay={0.1} />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-background p-5">
            <CrateSkeleton className="h-9 w-24 border-0" delay={i * 0.08} />
            <CrateSkeleton className="mt-3 h-2.5 w-16 border-0" delay={i * 0.08 + 0.05} />
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <CrateSkeleton className="h-64 w-full" delay={0.2} />
        <CrateSkeleton className="h-64 w-full" delay={0.28} />
      </div>
    </div>
  );
}
