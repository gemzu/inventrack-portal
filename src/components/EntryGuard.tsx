"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import PageShell from "@/components/page-shell";

/* Invoice entry pages: people the owner switched Invoice entry on for. The
   database checks the same on every call (caller_can_entry); this only saves
   everyone else from an empty page that does not say why. */
export default function EntryGuard({ children }: { children: ReactNode }) {
  const { canEntry, loading, accessReady } = useAuth();
  if (loading || !accessReady) return null;
  if (!canEntry) {
    return (
      <PageShell title="Invoice entry" subtitle="Not switched on for you.">
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Invoice entry is for people the owner has chosen. Ask the owner to switch it on for you on the Access page.
        </p>
      </PageShell>
    );
  }
  return <>{children}</>;
}
