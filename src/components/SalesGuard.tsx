"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";

/* Sales orders and invoices: admins the owner has ticked. The database
   enforces the same rule (caller_can_sales); this only saves an unticked
   admin from an empty page that would not say why. */
export default function SalesGuard({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <Inner>{children}</Inner>
    </AdminGuard>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const { canSales, loading } = useAuth();
  if (loading) return null;
  if (!canSales) {
    return (
      <PageShell title="Sales orders" subtitle="Not switched on for you.">
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Sales orders and invoices are only for people the owner has given access to. Ask the owner to switch on
          &ldquo;Sales and invoices&rdquo; for you on the Users page.
        </p>
      </PageShell>
    );
  }
  return <>{children}</>;
}
