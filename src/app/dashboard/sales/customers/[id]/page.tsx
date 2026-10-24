"use client";

/**
 * One customer: their details (editable), their W-9, and every order and
 * invoice with where the money stands. Editing here never changes an invoice
 * already issued - each invoice keeps its own copy of the bill-to details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import { Panel, Figure, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Select, Textarea } from "@/components/console/controls";
import {
  balances, fmtDate, fmtMoney, invoiceState, STATUS_LABEL, STATUS_TONE, todayIso,
  type Customer, type SalesInvoice, type SalesOrder, type StorefrontBuyer,
} from "@/lib/sales";

type Form = {
  name: string; contact_name: string; email: string; phone: string; billing_address: string;
  terms: string; w9_url: string; w9_received_at: string; notes: string; buyer_id: string;
};
const toForm = (c: Customer): Form => ({
  name: c.name || "", contact_name: c.contact_name || "", email: c.email || "", phone: c.phone || "",
  billing_address: c.billing_address || "", terms: c.terms || "Net 30", w9_url: c.w9_url || "",
  w9_received_at: c.w9_received_at || "", notes: c.notes || "", buyer_id: c.buyer_id || "",
});

export default function CustomerPage() {
  return (
    <SalesGuard>
      <CustomerView />
    </SalesGuard>
  );
}

function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [c, setC] = useState<Customer | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buyers, setBuyers] = useState<StorefrontBuyer[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    supabase.rpc("sales_storefront_buyers").then(({ data }) => setBuyers((data || []) as StorefrontBuyer[]));
    const [cu, o, i] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("sales_orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("sales_invoices").select("*").eq("customer_id", id).order("issued_on", { ascending: false }),
    ]);
    const row = cu.data as Customer | null;
    setC(row);
    setF(row ? toForm(row) : null);
    setOrders((o.data || []) as SalesOrder[]);
    setInvoices((i.data || []) as SalesInvoice[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const b = useMemo(() => (c ? balances(invoices).get(c.id) : undefined), [invoices, c]);
  const dirty = !!c && !!f && JSON.stringify(toForm(c)) !== JSON.stringify(f);
  const w9Bad = !!f?.w9_url.trim() && !/^https:\/\//.test(f.w9_url.trim());
  const emailBad = !!f?.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());

  const save = async () => {
    if (!c || !f || !f.name.trim() || w9Bad || emailBad) return;
    setSaving(true);
    const { error } = await supabase.from("customers").update({
      name: f.name.trim(), contact_name: f.contact_name.trim() || null, email: f.email.trim() || null,
      phone: f.phone.trim() || null, billing_address: f.billing_address.trim() || null,
      terms: f.terms.trim() || "Net 30", w9_url: f.w9_url.trim() || null,
      w9_received_at: f.w9_url.trim() ? (f.w9_received_at || todayIso()) : null,
      notes: f.notes.trim() || null, buyer_id: f.buyer_id || null, updated_at: new Date().toISOString(),
    }).eq("id", c.id);
    setSaving(false);
    if (error) { toast(`Not saved: ${error.message}`, "error"); return; }
    toast("Customer saved", "success");
    await load();
  };

  const setArchived = async (archived: boolean) => {
    if (!c) return;
    if (archived && !confirm(`Archive ${c.name}? They leave the customer pickers; their orders and invoices stay.`)) return;
    const { error } = await supabase.from("customers").update({ archived, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { toast(error.message, "error"); return; }
    toast(archived ? "Archived" : "Back in the list", "success");
    await load();
  };

  if (loading) {
    return (
      <PageShell title="Customer" subtitle="Opening it.">
        <CrateSkeleton className="h-72 w-full" />
      </PageShell>
    );
  }
  if (!c || !f) {
    return (
      <PageShell title="Customer" subtitle="Not found, or not yours to see.">
        <Link href="/dashboard/sales/customers" className="text-sm text-[var(--brand-2)] hover:underline">Back to customers</Link>
      </PageShell>
    );
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <PageShell
      title={c.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/sales/customers" className="hover:underline">Customers</Link>
          {c.archived ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">Archived</span> : null}
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Action onClick={() => setArchived(!c.archived)}>{c.archived ? "Unarchive" : "Archive"}</Action>
          <Action solid onClick={save} disabled={!dirty || saving || !f.name.trim() || w9Bad || emailBad}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save changes
          </Action>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label="Owed" value={fmtMoney(b?.owed || 0)} />
          <Figure label="Overdue" value={fmtMoney(b?.overdue || 0)} tone={b?.overdue ? "destructive" : undefined} />
          <Figure label="Paid" value={fmtMoney(b?.paid || 0)} />
          <Figure label="Billed in all" value={fmtMoney(b?.billed || 0)} note={`${b?.invoices || 0} invoice${b?.invoices === 1 ? "" : "s"}`} />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[1fr_24rem]">
          <Panel className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company or name"><Input value={f.name} onChange={set("name")} /></Field>
              <Field label="Contact"><Input value={f.contact_name} onChange={set("contact_name")} /></Field>
              <Field label="Billing email" hint={emailBad ? "That does not look like an email address." : undefined}>
                <Input type="email" value={f.email} onChange={set("email")} aria-invalid={emailBad} className={emailBad ? "border-destructive" : ""} />
              </Field>
              <Field label="Phone"><Input type="tel" value={f.phone} onChange={set("phone")} /></Field>
            </div>
            <Field label="Billing address"><Textarea rows={3} value={f.billing_address} onChange={set("billing_address")} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Payment terms" hint="Net 30, Net 45, Due on receipt... New orders start with these."><Input value={f.terms} onChange={set("terms")} /></Field>
              <div />
            </div>
            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
              <Field label="W-9 link" hint={w9Bad ? "The link must start with https://" : "Where the signed W-9 is kept (Drive, Dropbox...)."}>
                <Input value={f.w9_url} onChange={set("w9_url")} placeholder="https://" aria-invalid={w9Bad} className={w9Bad ? "border-destructive" : ""} />
              </Field>
              <Field label="W-9 received">
                <Input type="date" value={f.w9_received_at} max={todayIso()} onChange={set("w9_received_at")} disabled={!f.w9_url.trim()} />
              </Field>
            </div>
            {c.w9_url ? (
              <a href={c.w9_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand-2)] hover:underline">
                Open the W-9 <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <Field label="Linked buyer account" hint="A buyer on one of your storefronts. Their storefront orders can then be billed to this customer in one step.">
              <Select value={f.buyer_id} onChange={(e) => setF({ ...f, buyer_id: e.target.value })} aria-label="Linked buyer account">
                <option value="">Not linked</option>
                {buyers.filter((b) => !b.customer_id || b.customer_id === c.id).map((b) => (
                  <option key={b.buyer_id} value={b.buyer_id}>{[b.company || b.name || b.email, b.email].filter(Boolean).join(" · ")} ({b.storefronts})</option>
                ))}
              </Select>
            </Field>
            <Field label="Notes (only for you)"><Textarea rows={3} value={f.notes} onChange={set("notes")} /></Field>
            {dirty ? <p className="text-[12px] text-muted-foreground">Unsaved changes. Invoices already issued keep the details they were issued with.</p> : null}
          </Panel>

          <div className="space-y-4">
            <Panel className="p-5">
              <p className="mb-2 text-[12px] text-muted-foreground">Invoices</p>
              {invoices.length === 0 ? <p className="text-[13px] text-muted-foreground">None yet.</p> : (
                <ul className="space-y-1">
                  {invoices.map((v) => {
                    const st = invoiceState(v);
                    return (
                      <li key={v.id}>
                        <Link href={`/dashboard/invoices/sales/${v.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
                          <span className="mono w-32 shrink-0 text-[13px] font-semibold">{v.number}</span>
                          <span className="mono flex-1 text-right text-[13px] tabular-nums">{fmtMoney(v.total_cents)}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            <Panel className="p-5">
              <p className="mb-2 text-[12px] text-muted-foreground">Sales orders</p>
              {orders.length === 0 ? <p className="text-[13px] text-muted-foreground">None yet.</p> : (
                <ul className="space-y-1">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/dashboard/orders/sales/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
                        <span className="mono w-32 shrink-0 text-[13px] font-semibold">{o.number}</span>
                        <span className="flex-1 text-right text-[12px] text-muted-foreground">{fmtDate(o.created_at)}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
