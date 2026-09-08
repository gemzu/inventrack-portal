import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | { seconds: number } | string | null | undefined): string {
  if (!date) return "N/A";
  let d: Date;
  if (typeof date === "object" && "seconds" in date) {
    d = new Date((date as { seconds: number }).seconds * 1000);
  } else if (typeof date === "string") {
    d = new Date(date);
  } else {
    d = date;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | { seconds: number } | string | null | undefined): string {
  if (!date) return "N/A";
  let d: Date;
  if (typeof date === "object" && "seconds" in date) {
    d = new Date((date as { seconds: number }).seconds * 1000);
  } else if (typeof date === "string") {
    d = new Date(date);
  } else {
    d = date;
  }
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case "available": return "text-success bg-success/15 border-success/30";
    case "reserved": return "text-warning bg-warning/15 border-warning/30";
    case "sold": return "text-primary bg-primary/15 border-primary/30";
    case "pending": case "pending_approval": return "text-warning bg-warning/15 border-warning/30";
    case "approved": case "confirmed": case "completed": case "delivered": return "text-success bg-success/15 border-success/30";
    case "rejected": case "cancelled": return "text-destructive bg-destructive/15 border-destructive/30";
    case "processing": case "shipped": return "text-primary bg-primary/15 border-primary/30";
    default: return "text-muted-foreground bg-muted border-muted";
  }
}

export function statusDotColor(status: string): string {
  switch (status) {
    case "available": case "approved": case "confirmed": case "completed": case "delivered":
      return "bg-success/15";
    case "reserved": case "pending": case "pending_approval":
      return "bg-warning/15";
    case "sold": case "processing": case "shipped":
      return "bg-primary/15";
    case "rejected": case "cancelled":
      return "bg-destructive/15";
    default: return "bg-muted";
  }
}
