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

/**
 * Why did that fail, in words the person reading it can act on.
 *
 * Three features in this app were broken for months behind the phrase
 * "Failed to <verb> <noun>": approving a submission, processing the
 * enrichment queue, and saving a facility. In every case the database had
 * said exactly what was wrong and a bare `catch` threw it away before anyone
 * could read it.
 *
 * Postgres and PostgREST are precise but not friendly — "new row violates
 * row-level security policy" is the truth and means nothing to an admin
 * wondering why a button did nothing. So the handful of codes that actually
 * come up get translated, and everything else passes through verbatim rather
 * than being flattened into another dead end.
 */
export function reasonFor(err: unknown, fallback = "Something went wrong."): string {
  if (!err) return fallback;

  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const raw = (e.message || String(err) || "").trim();
  const code = e.code || "";

  // 42501 / RLS: allowed to be signed in, not allowed to do this.
  if (code === "42501" || /row-level security|violates row-level security/i.test(raw)) {
    return "You do not have permission to do that. It usually means your account is not an admin of this organization.";
  }
  // 23505: a uniqueness constraint.
  if (code === "23505" || /duplicate key|already exists/i.test(raw)) {
    return "That already exists.";
  }
  // 23503: pointing at something that is gone, or something still points here.
  if (code === "23503" || /foreign key/i.test(raw)) {
    return "Something else still refers to this, so it cannot be changed or removed yet.";
  }
  // 42703 / PGRST204: the code named a column the table does not have.
  if (code === "42703" || code === "PGRST204" || /does not exist/i.test(raw)) {
    return `The app sent a field this table does not have — ${raw}`;
  }
  // PGRST202: an RPC that is not deployed.
  if (code === "PGRST202") {
    return `That operation is not available on the server yet — ${raw}`;
  }
  if (/fetch failed|network|Failed to fetch/i.test(raw)) {
    return "Could not reach the server. Check your connection and try again.";
  }

  return raw || fallback;
}
