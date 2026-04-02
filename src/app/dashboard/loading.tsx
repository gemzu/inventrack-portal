export default function DashboardLoading() {
  return (
    <div className="animate-page-enter space-y-6">
      {/* Skeleton header */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-gray-700/50 skeleton-shimmer" />
        <div className="h-4 w-72 rounded-lg bg-gray-200 dark:bg-gray-700/50 skeleton-shimmer" />
      </div>
      {/* Skeleton cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card p-5 space-y-3" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700/50 skeleton-shimmer" />
            <div className="h-6 w-16 rounded-lg bg-gray-200 dark:bg-gray-700/50 skeleton-shimmer" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700/50 skeleton-shimmer" />
          </div>
        ))}
      </div>
      {/* Skeleton chart area */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-[300px] skeleton-shimmer rounded-2xl" />
        <div className="glass-card p-6 h-[300px] skeleton-shimmer rounded-2xl" />
      </div>
    </div>
  );
}
