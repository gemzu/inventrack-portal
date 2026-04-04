import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="animate-page-enter space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 h-[300px]">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 h-[300px]">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
