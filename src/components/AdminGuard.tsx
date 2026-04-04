"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Wraps admin-only pages. Redirects non-admins to /dashboard.
 * Also shows a message if orgId is missing.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { userRole, orgId, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This page is only accessible to administrators.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-10 text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">No Organization</h2>
            <p className="text-sm text-muted-foreground">
              Create or join an organization in the mobile app to manage this section.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
