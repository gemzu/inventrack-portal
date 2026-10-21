import { supabase } from "@/lib/supabase";

/* Sales orders (phase 1). Every write goes through a server function that
   checks the person has Sales and invoices ticked and works the totals out
   itself; the page never writes an order, a line or a total directly.
   Money is whole cents, as in CleanCyclem Payments. No cost price anywhere. */

export type SalesStatus = "draft" | "sent" | "invoiced" | "paid" | "void";

export interface BillingCompany {
  id: string; name: string; address?: string | null; email?: string | null; phone?: string | null;
  invoice_prefix: string; logo_url?: string | null; payment_details?: string | null; archived: boolean;
}
export interface Customer {
  id: string; name: string; contact_name?: string | null; email?: string | null; phone?: string | null;
  billing_address?: string | null; terms: string; w9_url?: string | null; archived: boolean;
}
export interface SalesOrder {
  id: string; number: string; status: SalesStatus; billing_company_id: string; customer_id: string | null;
  customer_po: string | null; notes: string | null; terms: string; freight_cents: number;
  subtotal_cents: number; total_cents: number; void_reason: string | null; created_at: string; sent_at: string | null;
}
export interface SalesLine {
  id?: string; source_item_id: string | null; description: string; part_number: string | null; brand: string | null;
  quantity: number; unit_price_cents: number | null; line_cents?: number; reserved_item_id?: string | null;
}

export const fmtMoney = (cents: number | null | undefined) =>
  ((Number(cents) || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "12.5" or "$1,200.50" -> 1250 / 120050; empty -> null (no price yet). */
export const toCents = (s: string): number | null => {
  const t = String(s ?? "").replace(/[^0-9.]/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

export const STATUS_LABEL: Record<SalesStatus, string> = {
  draft: "Draft", sent: "Sent", invoiced: "Invoiced", paid: "Paid", void: "Void",
};

/** The reason the database gave, in words a person can act on. */
export function why(e: unknown): string {
  const m = (e as { message?: string })?.message || String(e || "");
  return m.replace(/^.*?ERROR:\s*/i, "") || "Something went wrong";
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const createSalesOrder = (company: string, customer: string | null, items: { id: string; qty?: number }[]) =>
  rpc<string>("sales_order_create", { p_company: company, p_customer: customer, p_items: items });
export const saveSalesOrder = (id: string, fields: Record<string, unknown>, lines: SalesLine[] | null) =>
  rpc<void>("sales_order_save", { p_order: id, p_fields: fields, p_lines: lines });
export const sendSalesOrder = (id: string) => rpc<void>("sales_order_send", { p_order: id });
export const unsendSalesOrder = (id: string) => rpc<void>("sales_order_unsend", { p_order: id });
export const voidSalesOrder = (id: string, reason: string) => rpc<void>("sales_order_void", { p_order: id, p_reason: reason });

export const STATUS_TONE: Record<SalesStatus, string> = {
  draft: "bg-muted text-foreground/80",
  sent: "bg-[color-mix(in_oklab,var(--brand-2)_14%,transparent)] text-[var(--brand-2)]",
  invoiced: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  void: "bg-muted text-muted-foreground line-through",
};
