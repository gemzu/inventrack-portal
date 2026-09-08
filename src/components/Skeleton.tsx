export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-lg shimmer ${className}`} style={style} />;
}

function SkelCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card/70 backdrop-blur-xl p-5">
      {children}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <SkelCard>
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="w-11 h-11 rounded-md" />
      </div>
    </SkelCard>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-md border border-border bg-card/70 backdrop-blur-xl overflow-hidden">
      <div className="flex gap-4 p-4 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-4 border-b border-border/50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ opacity: 1 - r * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-md border border-border bg-card/70 backdrop-blur-xl p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[250px] w-full rounded-md" />
    </div>
  );
}
