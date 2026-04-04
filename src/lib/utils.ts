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
    case "available": return "text-green-600 bg-green-50 border-green-200";
    case "reserved": return "text-amber-600 bg-amber-50 border-amber-200";
    case "sold": return "text-blue-600 bg-blue-50 border-blue-200";
    case "pending": case "pending_approval": return "text-amber-600 bg-amber-50 border-amber-200";
    case "approved": case "confirmed": case "completed": case "delivered": return "text-green-600 bg-green-50 border-green-200";
    case "rejected": case "cancelled": return "text-red-600 bg-red-50 border-red-200";
    case "processing": case "shipped": return "text-blue-600 bg-blue-50 border-blue-200";
    default: return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function statusDotColor(status: string): string {
  switch (status) {
    case "available": case "approved": case "confirmed": case "completed": case "delivered":
      return "bg-green-500";
    case "reserved": case "pending": case "pending_approval":
      return "bg-amber-500";
    case "sold": case "processing": case "shipped":
      return "bg-blue-500";
    case "rejected": case "cancelled":
      return "bg-red-500";
    default: return "bg-zinc-500";
  }
}
