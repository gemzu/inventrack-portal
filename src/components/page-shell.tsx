"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="min-w-0">
            {title && <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight truncate">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </motion.div>
      )}
      {children}
    </div>
  );
}
