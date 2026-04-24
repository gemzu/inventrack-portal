"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function GlassCard({ className, children, style }: GlassCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm",
        "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}