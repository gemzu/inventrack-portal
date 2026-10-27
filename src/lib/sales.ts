import { supabase } from "@/lib/supabase";

/* Sales orders (phase 1). Every write goes through a server function that
   checks the person has Sales and invoices ticked and works the totals out
   itself; the page never writes an order, a line or a total directly.
   Money is whole cents, as in CleanCyclem Payments. No cost price anywhere. */

export type SalesStatus = "draft" | "sent" | "invoiced" | "paid" | "void";

export interface BillingCompany {
  id: string; name: string; address?: string | null; email?: string | null; phone?: string | null;
  invoice_prefix: string; logo_url?: string | null; payment_details?: string | null; pay_link?: string | null; archived: boolean;
}
export interface Customer {
  id: string; name: string; contact_name?: string | null; email?: string | null; phone?: string | null;
  billing_address?: string | null; terms: string; w9_url?: string | null; archived: boolean;
  w9_received_at?: string | null; notes?: string | null; created_at?: string; buyer_id?: string | null;
}
export interface StorefrontBuyer { buyer_id: string; name: string | null; email: string | null; company: string | null; storefronts: string; customer_id: string | null }

/** What a customer has been billed, has paid and still owes (void invoices left out). */
export interface Balance { billed: number; paid: number; owed: number; overdue: number; lastIssued: string | null; invoices: number }
export function balances(invoices: Pick<SalesInvoice, "customer_id" | "status" | "total_cents" | "due_on" | "issued_on">[], today = todayIso()) {
  const m = new Map<string, Balance>();
  for (const i of invoices) {
    if (i.status === "void") continue;
    const b = m.get(i.customer_id) || { billed: 0, paid: 0, owed: 0, overdue: 0, lastIssued: null, invoices: 0 };
    const t = Number(i.total_cents) || 0;
    b.billed += t;
    b.invoices += 1;
    if (i.status === "paid") b.paid += t;
    else {
      b.owed += t;
      if (i.due_on < today) b.overdue += t;
    }
    if (!b.lastIssued || i.issued_on > b.lastIssued) b.lastIssued = i.issued_on;
    m.set(i.customer_id, b);
  }
  return m;
}
export interface SalesOrder {
  id: string; number: string; status: SalesStatus; billing_company_id: string; customer_id: string | null;
  customer_po: string | null; notes: string | null; terms: string; freight_cents: number;
  subtotal_cents: number; total_cents: number; void_reason: string | null; created_at: string; sent_at: string | null;
  storefront_order_id?: string | null;
  tax_rate?: string | number | null; tax_label?: string | null; tax_cents?: number;
  ship_to_name?: string | null; ship_to_address?: string | null; ship_date?: string | null; tracking_no?: string | null; job_number?: string | null;
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
/** Sales tax on the items only - never on freight or delivery. Same
    rounding as the server (sales_order_recalc): to the nearest cent. */
export const taxOn = (subtotalCents: number, rate: number | null) =>
  rate == null || !(rate > 0) ? 0 : Math.round((subtotalCents * rate) / 100);
/** "NJ sales tax (6.625%)" */
export const taxLine = (label: string | null | undefined, rate: string | number | null | undefined) =>
  `${label || "Sales tax"}${rate != null && rate !== "" ? ` (${Number(rate)}%)` : ""}`;
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

/* ── Invoices (phase 2) ─────────────────────────────────────────────────
   Issued from a sent order by sales_invoice_create; the invoice keeps its
   own copy of who billed whom, so it never changes after it is issued. */

export type InvoiceStatus = "issued" | "paid" | "void";
export type PayMethod = "ach" | "wire" | "check" | "card" | "cash" | "other";

export interface SalesInvoice {
  id: string; order_id: string; billing_company_id: string; customer_id: string;
  number: string; status: InvoiceStatus; issued_on: string; due_on: string; terms: string;
  customer_po: string | null; notes: string | null;
  bill_to_name: string; bill_to_contact: string | null; bill_to_address: string | null; bill_to_email: string | null;
  from_name: string; from_address: string | null; from_email: string | null; from_phone: string | null;
  from_logo_url: string | null; payment_details: string | null;
  subtotal_cents: number; freight_cents: number; total_cents: number;
  tax_rate?: string | number | null; tax_label?: string | null; tax_cents?: number;
  /* Shipping details and the pay link. Optional: an invoice without them prints
     with Ship To the same as Bill To and no QR code. */
  ship_to_name?: string | null; ship_to_address?: string | null; ship_date?: string | null;
  tracking_no?: string | null; job_number?: string | null; pay_link?: string | null;
  paid_on: string | null; paid_method: PayMethod | null; paid_reference: string | null;
  void_reason: string | null; created_at: string;
}
export interface SalesInvoiceLine {
  id: string; sort: number; description: string; part_number: string | null; brand: string | null;
  quantity: number; unit_price_cents: number; line_cents: number;
}

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  ach: "ACH", wire: "Wire", check: "Check", card: "Card", cash: "Cash", other: "Other",
};

/** Today in the browser's own calendar, as YYYY-MM-DD. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const asDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
/** "Oct 24, 2026" from a date-only value, with no time-zone shift. */
export const fmtDate = (iso: string | null | undefined) =>
  iso ? asDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
/** Whole days from a to b (b later = positive). */
export const daysBetween = (a: string, b: string) => Math.round((asDate(b).getTime() - asDate(a).getTime()) / 864e5);

/** Same rule as the server's sales_due_date, for the preview before issuing. */
export function dueFromTerms(terms: string, issued: string): string {
  const net = /net\s*(\d+)/i.exec(terms || "");
  const days = net ? Math.min(Number(net[1]), 365) : /receipt/i.test(terms || "") ? 0 : 30;
  const d = asDate(issued);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** What a person needs to know about an invoice right now. */
export function invoiceState(inv: Pick<SalesInvoice, "status" | "due_on">, today = todayIso()):
  { key: "paid" | "void" | "overdue" | "due"; label: string; tone: string } {
  if (inv.status === "paid") return { key: "paid", label: "Paid", tone: STATUS_TONE.paid };
  if (inv.status === "void") return { key: "void", label: "Void", tone: STATUS_TONE.void };
  const late = daysBetween(inv.due_on, today);
  if (late > 0) return { key: "overdue", label: `${late} day${late === 1 ? "" : "s"} overdue`, tone: "bg-destructive/12 text-destructive" };
  const left = -late;
  return { key: "due", label: left === 0 ? "Due today" : `Due in ${left} day${left === 1 ? "" : "s"}`, tone: STATUS_TONE.invoiced };
}

/* ── Money report (sales_report) ─────────────────────────────────────── */
export interface Bucket { cents: number; count: number }
export interface SalesReport {
  from: string; to: string; today: string;
  totals: { billed: number; invoices: number; received: number; owed_now: number; overdue_now: number };
  months: { month: string; billed: number; received: number; invoices: number }[];
  customers: { id: string; name: string; billed: number; paid: number; owed: number; overdue: number; invoices: number }[];
  ageing: { current: Bucket; d1_30: Bucket; d31_60: Bucket; d61_90: Bucket; d90: Bucket };
  missing_w9: { id: string; name: string; billed: number }[];
}
export const salesReport = (from: string, to: string, company: string | null) =>
  rpc<SalesReport>("sales_report", { p_from: from, p_to: to, p_company: company });

/* Every company the person has Sales and invoices ticked in (sales_report_all). */
export type CompanyTotals = SalesReport["totals"] & { id: string; name: string };
export interface SalesReportAll {
  from: string; to: string; today: string;
  companies: CompanyTotals[];
  totals: SalesReport["totals"];
  months: SalesReport["months"];
}
export const salesReportAll = (from: string, to: string) =>
  rpc<SalesReportAll>("sales_report_all", { p_from: from, p_to: to });

/* ── CSV for the accountant ────────────────────────────────────────────
   Opens cleanly in Excel (BOM, CRLF, quotes doubled) and cannot run as a
   formula when opened (a cell starting with = + - @ gets a leading quote). */
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): Blob {
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Blob(["﻿" + text + "\r\n"], { type: "text/csv;charset=utf-8" });
}
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
/** 12345 cents -> "123.45" (no symbol or commas: the accountant's sheet sums it). */
export const centsPlain = (c: number | null | undefined) => (Number(c || 0) / 100).toFixed(2);

export const createInvoice = (orderId: string, issuedOn: string) =>
  rpc<string>("sales_invoice_create", { p_order: orderId, p_issued_on: issuedOn });
export const markInvoicePaid = (id: string, paidOn: string, method: PayMethod, reference: string) =>
  rpc<void>("sales_invoice_mark_paid", { p_invoice: id, p_paid_on: paidOn, p_method: method, p_reference: reference });
export const markInvoiceUnpaid = (id: string) => rpc<void>("sales_invoice_mark_unpaid", { p_invoice: id });
export const voidInvoice = (id: string, reason: string) => rpc<void>("sales_invoice_void", { p_invoice: id, p_reason: reason });

export const STATUS_TONE: Record<SalesStatus, string> = {
  draft: "bg-muted text-foreground/80",
  sent: "bg-[color-mix(in_oklab,var(--brand-2)_14%,transparent)] text-[var(--brand-2)]",
  invoiced: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  void: "bg-muted text-muted-foreground line-through",
};
