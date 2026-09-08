/**
 * Waiting, everywhere else.
 *
 * These were grey shimmer blocks inside blurred cards — the surface the
 * console no longer uses. They are now the same empty crates the rest of the
 * dashboard waits with: a hairline box and the boot gate's light passing
 * across it. The exports keep their names so the screens importing them do not
 * need to change.
 */

import { CrateSkeleton } from "@/components/console/surfaces";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`crate-skeleton border-0 ${className}`} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="panel p-5">
      <CrateSkeleton className="h-8 w-24 border-0" />
      <CrateSkeleton className="mt-3 h-2.5 w-16 border-0" delay={0.06} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <CrateSkeleton key={i} className="h-2.5 flex-1 border-0" delay={i * 0.05} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="row-line flex gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <CrateSkeleton key={c} className="h-3 flex-1 border-0" delay={r * 0.06 + c * 0.03} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="panel p-5">
      <CrateSkeleton className="h-2.5 w-32 border-0" />
      <CrateSkeleton className="mt-4 h-[250px] w-full border-0" delay={0.08} />
    </div>
  );
}
