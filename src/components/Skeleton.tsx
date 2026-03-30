export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className}`}
      style={{ background: "var(--border)" }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 p-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[250px] w-full rounded-xl" />
    </div>
  );
}
