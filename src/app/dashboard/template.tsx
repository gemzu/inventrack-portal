"use client";

import { ReactNode } from "react";

/**
 * Owns the page-to-page transition for the whole dashboard. `template.tsx`
 * remounts on every navigation (unlike `layout.tsx`), so this single fade+rise
 * gives a consistent, smooth transition across all pages.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}
