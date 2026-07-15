"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Standard page wrapper. Provides consistent padding, entrance animation,
 * and a header row (title + subtitle + optional actions). Use on every
 * page — see WEB_UI_POLISH.md § 1.
 */
export default function PageShell({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
  children,
}: PageShellProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {breadcrumb && <div className="text-sm text-muted-foreground">{breadcrumb}</div>}
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-bold truncate">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
