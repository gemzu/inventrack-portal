import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | { seconds: number } | string | null | undefined): string {
  if (!date) return "N/A";
  let d: Date;
  if (typeof date === "object" && "seconds" in date) {
    d = new Date(date.seconds * 1000);
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
    d = new Date(date.seconds * 1000);
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
