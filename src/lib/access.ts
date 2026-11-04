/* Access: who can do what, and Invoice entry.
   Every call goes through a database function that checks the caller itself
   (owner only for the management side; a granted, unexpired, draft invoice
   for the entry side). Nothing here decides anything - it only asks. */

import { supabase } from "@/lib/supabase";

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/* ── The owner's side ─────────────────────────────────────────── */

export interface Member {
  user_id: string; email: string | null; name: string | null; role: "admin" | "worker";
  active: boolean; is_owner: boolean; can_sales: boolean; can_delete: boolean; can_entry: boolean;
  grants: number; last_active_at: string | null;
}
export interface Grant {
  grant_id: string; user_id: string; order_id: string; number: string; status: string;
  company_name: string | null; customer_name: string | null; expires_at: string | null; created_at: string;
}
export interface GrantableOrder {
  order_id: string; number: string; company_name: string | null; customer_name: string | null;
  line_count: number; created_at: string;
}
export interface HistoryRow {
  id: string; created_at: string; actor_email: string | null; target_user_id: string | null; summary: string;
}

export const accessOverview = (org: string) => rpc<Member[]>("access_overview", { p_org_id: org });
export const accessGrants = (org: string) => rpc<Grant[]>("access_grants", { p_org_id: org });
export const accessGrantable = (org: string) => rpc<GrantableOrder[]>("access_grantable_orders", { p_org_id: org });
export const accessHistory = (org: string, limit = 50) => rpc<HistoryRow[]>("access_history", { p_org_id: org, p_limit: limit });
export const setEntry = (org: string, user: string, on: boolean) =>
  rpc<boolean>("access_set_entry", { p_org_id: org, p_user_id: user, p_on: on });
export const setSales = (org: string, user: string, on: boolean) =>
  rpc<boolean>("org_set_sales_access", { p_org_id: org, p_user_id: user, p_on: on });
export const setDelete = (org: string, user: string, on: boolean) =>
  rpc<boolean>("org_set_delete_access", { p_org_id: org, p_user_id: user, p_on: on });
export const grantOrder = (org: string, user: string, order: string, expires: string | null) =>
  rpc<string>("access_grant_order", { p_org_id: org, p_user_id: user, p_order: order, p_expires: expires });
export const revokeOrder = (org: string, user: string, order: string) =>
  rpc<boolean>("access_revoke_order", { p_org_id: org, p_user_id: user, p_order: order });

/* ── The helper's side ────────────────────────────────────────── */

export interface EntryOrderRow {
  order_id: string; number: string; status: string; company_name: string | null; customer_name: string | null;
  line_count: number; units: number; total_cents: number; expires_at: string | null; updated_at: string;
}
export interface EntryOrder {
  id: string; number: string; status: string; company: string | null; customer: string | null; terms: string | null;
  subtotal_cents: number; total_cents: number;
}
export interface EntryLine {
  id: string; sort: number; description: string; part_number: string | null; quantity: number;
  unit_price_cents: number | null; line_cents: number | null; locked: boolean;
}

export const entryOrdersMine = () => rpc<EntryOrderRow[]>("entry_orders_mine");
export const entryOrderGet = (order: string) => rpc<{ order: EntryOrder; lines: EntryLine[] }>("entry_order_get", { p_order: order });
export const entryLinesSave = (order: string, lines: { description: string; part_number: string | null; quantity: number; unit_price_cents: number | null }[]) =>
  rpc<{ lines: number; subtotal_cents: number }>("entry_lines_save", { p_order: order, p_lines: lines });

/* What a person can and cannot do, in plain words, from their switches.
   The Access page shows this beside every toggle, so the owner reads the
   consequence rather than a permission name. */
export function describeAccess(m: Pick<Member, "role" | "is_owner" | "can_sales" | "can_delete" | "can_entry" | "grants">) {
  const can: string[] = [];
  const cannot: string[] = [];
  if (m.is_owner) {
    can.push("Everything, including who can do what");
    return { can, cannot };
  }
  if (m.role === "admin") {
    can.push("See and change stock, boxes, orders, purchase orders, reports and settings");
    can.push("Manage users and invites");
    if (m.can_sales) can.push("Sales orders, invoices, customers, billing companies and money reports");
    else cannot.push("Sales orders, invoices and money reports");
    if (m.can_delete) can.push("Delete records");
    else cannot.push("Delete records");
    cannot.push("Change who can do what (owner only)");
  } else {
    can.push("Scan and add stock in the phone app");
    cannot.push("See stock levels or prices on the website");
    cannot.push("Settings, users, reports");
    cannot.push("Customers and billing companies");
    if (m.can_entry) {
      can.push(m.grants > 0
        ? `Add and change items on ${m.grants} invoice${m.grants === 1 ? "" : "s"} you chose, and nothing else`
        : "Invoice entry is on, but no invoice is shared with them yet");
      cannot.push("Any invoice you have not shared with them");
    } else {
      cannot.push("Sales orders and invoices");
    }
    if (m.can_delete) can.push("Delete records");
  }
  return { can, cannot };
}
