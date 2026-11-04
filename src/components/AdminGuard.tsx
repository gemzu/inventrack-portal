"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { areaAllowed, type Area } from "@/lib/access";

/**
 * Wraps admin-only pages. Redirects non-admins to /dashboard.
 * Also shows a message if orgId is missing.
 */
export default function AdminGuard({ children, area }: { children: React.ReactNode; area?: Area }) {
  const { userRole, orgId, loading, perms, permsSet, accessReady } = useAuth();
  const router = useRouter();

  /* With an area, the owner's choice for this person decides (an admin can have
     it switched off, a worker can be given it); without, the role as before. */
  if (loading || (area && !accessReady)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = area ? areaAllowed(userRole, perms, permsSet, area) : userRole === "admin";
  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-md bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {area ? "This is not switched on for you. Ask the owner." : "This page is only accessible to administrators."}
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
