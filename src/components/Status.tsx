/**
 * One status marker for the whole app.
 *
 * There were four competing systems: STATUS_DOT in inventory, STATUS_STYLES in
 * invoices, statusColor() in utils, and inline pills written per page. They
 * disagreed on both colour and shape, which is a large part of why the
 * dashboard looked unlike the rest of the site.
 *
 * A dot and a word, in the semantic tone for that state. No filled chip: a
 * table of filled pills reads as decoration, and the eye only needs the colour
 * to say whether something needs attention.
 */

export type Tone = "success" | "warning" | "destructive" | "primary" | "muted";

/* Every state the app actually uses, mapped to what it means rather than to a
   colour someone liked. Anything unknown stays neutral on purpose. */
const TONES: Record<string, Tone> = {
  available: "success",
  approved: "success",
  confirmed: "success",
  completed: "success",
  delivered: "success",
  received: "success",
  paid: "success",
  active: "success",
  synced: "success",

  reserved: "warning",
  pending: "warning",
  pending_approval: "warning",
  partial: "warning",
  low: "warning",
  overdue: "warning",
  unpaid: "warning",

  rejected: "destructive",
  cancelled: "destructive",
  blocked: "destructive",
  failed: "destructive",

  sold: "primary",
  processing: "primary",
  shipped: "primary",
  ordered: "primary",
  sent: "primary",
  in_transit: "primary",

  draft: "muted",
  inactive: "muted",
  archived: "muted",
};

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
  muted: "bg-muted-foreground",
};

const TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function statusTone(status?: string | null): Tone {
  if (!status) return "muted";
  return TONES[status.toLowerCase().replace(/[\s-]+/g, "_")] || "muted";
}

export default function Status({
  status,
  label,
  className = "",
  /** Colour the label too. Off by default so a column of states stays calm. */
  emphasis = false,
}: {
  status?: string | null;
  /** Override the wording where a page has a better one than the raw enum. */
  label?: string;
  className?: string;
  emphasis?: boolean;
}) {
  const tone = statusTone(status);
  const text = label ?? (status || "unknown").replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
      <span className={`capitalize ${emphasis ? TEXT[tone] : "text-muted-foreground"}`}>
        {text}
      </span>
    </span>
  );
}
