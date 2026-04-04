export default function DashboardLoading() {
  return (
    <div className="animate-page-enter space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="skeleton h-7 w-16" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6 h-[300px] flex items-center justify-center">
          <div className="skeleton h-full w-full rounded-lg" />
        </div>
        <div className="card p-6 h-[300px] flex items-center justify-center">
          <div className="skeleton h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
