"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Loader2 } from "lucide-react";

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-10 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-danger" />
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            This page is only accessible to administrators.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-10 max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">No Organization</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Create or join an organization in the mobile app to manage this section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
