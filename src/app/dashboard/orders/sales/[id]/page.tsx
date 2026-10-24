"use client";

/**
 * One sales order. Draft: everything is editable. Sent: the units are
 * reserved and the order is locked (back to draft to change it). Void: kept,
 * with its reason, and its units released.
 *
 * The page shows totals as you type, but the database works them out again on
 * every save (sales_order_save), so what is stored never depends on this page.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import SalesGuard from "@/components/SalesGuard";
import { CustomerModal } from "@/components/sales/SalesModals";
import PageShell from "@/components/page-shell";
import { Panel, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Modal, Select, Textarea } from "@/components/console/controls";
import {
  centsToInput, fmtMoney, saveSalesOrder, sendSalesOrder, STATUS_LABEL, STATUS_TONE, toCents,
  unsendSalesOrder, voidSalesOrder, why,
  type BillingCompany, type Customer, type SalesLine, type SalesOrder,
} from "@/lib/sales";

type EditLine = SalesLine & { key: string; priceText: string };
type Stock = Record<string, { quantity: number; status: string }>;

let keySeq = 0;
const nextKey = () => `l${++keySeq}`;

export default function SalesOrderPage() {
  return (
    <SalesGuard>
      <SalesOrderEditor />
    </SalesGuard>
  );
}

function SalesOrderEditor() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stock, setStock] = useState<Stock>({});
  const [freightText, setFreightText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [addCustomer, setAddCustomer] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !id) return;
    const [o, l, c, b] = await Promise.all([
      supabase.from("sales_orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("sales_order_lines").select("*").eq("order_id", id).order("sort"),
      supabase.from("customers").select("*").eq("org_id", orgId).order("name"),
      supabase.from("billing_companies").select("*").eq("org_id", orgId).order("name"),
    ]);
    if (o.error || !o.data) { setLoading(false); return; }
    const ord = o.data as SalesOrder;
    setOrder(ord);
    setFreightText(centsToInput(Number(ord.freight_cents)));
    const ls = (l.data || []) as SalesLine[];
    setLines(ls.map((x) => ({ ...x, unit_price_cents: x.unit_price_cents == null ? null : Number(x.unit_price_cents), key: nextKey(), priceText: centsToInput(x.unit_price_cents == null ? null : Number(x.unit_price_cents)) })));
    setCustomers((c.data || []) as Customer[]);
    setCompanies((b.data || []) as BillingCompany[]);
    const ids = ls.map((x) => x.source_item_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: inv } = await supabase.from("inventory").select("id, quantity, status").in("id", ids);
      const m: Stock = {};
      for (const r of inv || []) m[r.id] = { quantity: Number(r.quantity) || 0, status: r.status || "available" };
      setStock(m);
    } else setStock({});
    setDirty(false);
    setLoading(false);
  }, [id, orgId]);

  useEffect(() => { load(); }, [load]);

  const editable = order?.status === "draft";
  const freight = toCents(freightText) ?? 0;
  const subtotal = lines.reduce((n, l) => n + l.quantity * (l.unit_price_cents ?? 0), 0);
  const total = subtotal + freight;

  /* What stops this order being sent, in plain words, per line. */
  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    for (const l of lines) {
      if (l.unit_price_cents == null) out[l.key] = "needs a price";
      if (editable && l.source_item_id) {
        const s = stock[l.source_item_id];
        if (!s || s.status !== "available") out[l.key] = "no longer available";
        else if (l.quantity > s.quantity) out[l.key] = `only ${s.quantity} in stock`;
      }
    }
    return out;
  }, [lines, stock, editable]);
  const unpriced = lines.filter((l) => l.unit_price_cents == null).length;
  const blocked = Object.keys(problems).length > 0 || !order?.customer_id || lines.length === 0;

  const setLine = (key: string, patch: Partial<EditLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setDirty(true);
  };
  const setField = (patch: Partial<SalesOrder>) => {
    setOrder((o) => (o ? { ...o, ...patch } : o));
    setDirty(true);
  };

  const payloadLines = (): SalesLine[] =>
    lines.map((l) => ({
      source_item_id: l.source_item_id, description: l.description.trim() || "Item",
      part_number: l.part_number, brand: l.brand, quantity: Math.max(1, Math.round(l.quantity) || 1),
      unit_price_cents: l.unit_price_cents,
    }));

  const save = async (quiet = false) => {
    if (!order) return false;
    setBusy("save");
    try {
      await saveSalesOrder(order.id, {
        customer_id: order.customer_id || "", billing_company_id: order.billing_company_id,
        customer_po: order.customer_po || "", notes: order.notes || "", terms: order.terms,
        freight_cents: freight,
      }, payloadLines());
      if (!quiet) toast("Draft saved", "success");
      await load();
      return true;
    } catch (e) {
      toast(`Not saved: ${why(e)}`, "error");
      return false;
    } finally { setBusy(null); }
  };

  const send = async () => {
    if (!order) return;
    if (dirty && !(await save(true))) return;
    setBusy("send");
    try {
      await sendSalesOrder(order.id);
      toast(`${order.number} sent - the units are reserved`, "success");
      await load();
    } catch (e) { toast(`Not sent: ${why(e)}`, "error"); } finally { setBusy(null); }
  };

  const unsend = async () => {
    if (!order) return;
    setBusy("unsend");
    try {
      await unsendSalesOrder(order.id);
      toast("Back to draft - the units are released", "success");
      await load();
    } catch (e) { toast(why(e), "error"); } finally { setBusy(null); }
  };

  const doVoid = async () => {
    if (!order || !voidReason.trim()) return;
    setBusy("void");
    try {
      await voidSalesOrder(order.id, voidReason.trim());
      toast(`${order.number} voided`, "success");
      setVoidOpen(false);
      await load();
    } catch (e) { toast(why(e), "error"); } finally { setBusy(null); }
  };

  if (loading) {
    return (
      <PageShell title="Sales order" subtitle="Opening it.">
        <CrateSkeleton className="h-64 w-full" />
      </PageShell>
    );
  }
  if (!order) {
    return (
      <PageShell title="Sales order" subtitle="Not found.">
        <Link href="/dashboard/orders/sales" className="text-sm text-[var(--brand-2)] hover:underline">Back to sales orders</Link>
      </PageShell>
    );
  }

  const company = companies.find((c) => c.id === order.billing_company_id);
  const customer = customers.find((c) => c.id === order.customer_id);

  return (
    <PageShell
      title="Sales order"
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/orders/sales" className="hover:underline">Sales orders</Link>
          <span>/</span>
          <span className="mono font-semibold text-foreground">{order.number}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {(order.status === "draft" || order.status === "sent") && (
            <Action onClick={() => { setVoidReason(""); setVoidOpen(true); }} disabled={!!busy}>Void</Action>
          )}
          {order.status === "sent" && (
            <Action onClick={unsend} disabled={!!busy}>{busy === "unsend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Back to draft</Action>
          )}
          {editable && (
            <>
              <Action onClick={() => save()} disabled={!!busy || !dirty}>{busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Save draft</Action>
              <Action solid onClick={send} disabled={!!busy || blocked}
                title={blocked ? "Fix the lines marked below first" : "Reserve the units and mark this order sent"}>
                {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Mark sent
              </Action>
            </>
          )}
        </div>
      }
    >
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_22rem]">
        <Panel className="min-w-0">
          {/* Who and by whom */}
          <div className="grid gap-4 border-b border-border p-5 md:grid-cols-2">
            <Field label="Bill to (customer)">
              {editable ? (
                <div className="flex gap-2">
                  <Select value={order.customer_id || ""} onChange={(e) => setField({ customer_id: e.target.value || null })} aria-label="Customer">
                    <option value="">Choose a customer</option>
                    {customers.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Action onClick={() => setAddCustomer(true)} aria-label="Add a customer" className="px-3"><Plus className="h-4 w-4" /></Action>
                </div>
              ) : <p className="text-sm font-medium">{customer?.name || "No customer"}</p>}
              {customer ? (
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {customer.w9_url
                    ? <span className="mr-2 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">W-9 on file</span>
                    : <span className="mr-2 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">No W-9</span>}
                  {[customer.email, customer.terms].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </Field>
            <Field label="Billed by (our company)">
              {editable ? (
                <Select value={order.billing_company_id} onChange={(e) => setField({ billing_company_id: e.target.value })} aria-label="Our company">
                  {companies.filter((c) => !c.archived || c.id === order.billing_company_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              ) : <p className="text-sm font-medium">{company?.name}</p>}
            </Field>
            <Field label="Customer PO (optional)">
              {editable
                ? <Input value={order.customer_po || ""} onChange={(e) => setField({ customer_po: e.target.value })} placeholder="Their reference" />
                : <p className="text-sm">{order.customer_po || "—"}</p>}
            </Field>
            <Field label="Payment terms">
              {editable
                ? <Input value={order.terms} onChange={(e) => setField({ terms: e.target.value })} placeholder="Net 30" />
                : <p className="text-sm">{order.terms}</p>}
            </Field>
          </div>

          {/* Lines */}
          <div className="hidden items-center gap-3 border-b border-border px-5 py-2.5 lg:flex">
            <ColHead className="min-w-0 flex-1">Item</ColHead>
            <ColHead className="w-24 shrink-0 text-right">Qty</ColHead>
            <ColHead className="w-32 shrink-0 text-right">Sale price</ColHead>
            <ColHead className="w-28 shrink-0 text-right">Line</ColHead>
            <span className="w-6 shrink-0" />
          </div>
          {lines.map((l) => {
            const p = problems[l.key];
            const s = l.source_item_id ? stock[l.source_item_id] : undefined;
            return (
              <div key={l.key} className="row-line flex flex-wrap items-center gap-3 px-5 py-3 lg:flex-nowrap">
                <div className="min-w-0 flex-1 basis-full lg:basis-auto">
                  {editable && !l.source_item_id
                    ? <Input value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} placeholder="Description" />
                    : <p className="truncate text-sm font-medium">{l.description}</p>}
                  <p className="mono truncate text-[12px] text-muted-foreground">
                    {[l.part_number, l.brand, l.source_item_id && editable && s ? `${s.quantity} in stock` : null, !l.source_item_id ? "custom line" : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="w-24 shrink-0">
                  {editable
                    ? <Input type="number" min={1} value={l.quantity} aria-label="Quantity"
                        onChange={(e) => setLine(l.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className={`mono text-right ${p && p.includes("stock") ? "border-destructive" : ""}`} />
                    : <p className="mono text-right text-sm">{l.quantity}</p>}
                </div>
                <div className="w-32 shrink-0">
                  {editable
                    ? <Input value={l.priceText} inputMode="decimal" aria-label="Sale price" placeholder="$ —"
                        onChange={(e) => setLine(l.key, { priceText: e.target.value, unit_price_cents: toCents(e.target.value) })}
                        onBlur={() => setLine(l.key, { priceText: centsToInput(l.unit_price_cents) })}
                        className={`mono text-right ${l.unit_price_cents == null ? "border-amber-500 bg-amber-500/5" : ""}`} />
                    : <p className="mono text-right text-sm">{fmtMoney(l.unit_price_cents)}</p>}
                </div>
                <div className="w-28 shrink-0 text-right">
                  {p ? <span className={`text-[12px] font-semibold ${p.includes("price") ? "text-amber-700 dark:text-amber-300" : "text-destructive"}`}>{p}</span>
                     : <span className="mono text-sm">{fmtMoney(l.quantity * (l.unit_price_cents ?? 0))}</span>}
                </div>
                <div className="w-6 shrink-0">
                  {editable ? (
                    <button onClick={() => { setLines((prev) => prev.filter((x) => x.key !== l.key)); setDirty(true); }}
                      aria-label={`Remove ${l.description}`} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {editable && (
            <div className="flex flex-wrap gap-2 p-4">
              <Action onClick={() => { setLines((prev) => [...prev, { key: nextKey(), source_item_id: null, description: "", part_number: null, brand: null, quantity: 1, unit_price_cents: null, priceText: "" }]); setDirty(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add a custom line
              </Action>
              <Link href="/dashboard/inventory" className="inline-flex items-center rounded-md px-3 text-[13px] text-muted-foreground hover:text-foreground">
                Add stock: select it on Inventory and start a new order
              </Link>
            </div>
          )}
        </Panel>

        {/* Totals and what is in the way */}
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex justify-between py-1.5 text-sm"><span>Subtotal</span><span className="mono">{fmtMoney(subtotal)}</span></div>
            <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span>Freight</span>
              {editable
                ? <Input value={freightText} inputMode="decimal" aria-label="Freight" placeholder="0.00" className="mono w-28 text-right"
                    onChange={(e) => { setFreightText(e.target.value); setDirty(true); }} onBlur={() => setFreightText(centsToInput(toCents(freightText) ?? 0))} />
                : <span className="mono">{fmtMoney(order.freight_cents)}</span>}
            </div>
            <div className="flex justify-between py-1.5 text-sm text-muted-foreground"><span>Tax</span><span>not added</span></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-display text-lg font-bold">Total</span>
              <span className="font-display text-2xl font-bold tracking-[-0.03em]">{fmtMoney(total)}</span>
            </div>
          </Panel>

          {editable && blocked ? (
            <div className="flex gap-2 rounded-md bg-amber-500/10 p-3 text-[13px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Before this can be sent:{" "}
                {[
                  !order.customer_id && "choose the customer",
                  unpriced && `${unpriced} line${unpriced === 1 ? "" : "s"} need${unpriced === 1 ? "s" : ""} a sale price`,
                  Object.values(problems).some((x) => x.includes("stock") || x.includes("available")) && "some quantities are more than is in stock",
                  lines.length === 0 && "add at least one line",
                ].filter(Boolean).join("; ")}.
              </span>
            </div>
          ) : null}
          <p className="rounded-md bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)] p-3 text-[13px] text-[var(--brand-2)]">
            {order.status === "draft" && "Draft: nothing is reserved yet. Mark sent reserves the units."}
            {order.status === "sent" && "Sent: these units are reserved for this order. Back to draft or Void releases them."}
            {order.status === "void" && `Void: ${order.void_reason || "no reason given"}. The units were released.`}
          </p>
          <Panel className="p-5">
            <Field label="Notes on the order">
              {editable
                ? <Textarea rows={3} value={order.notes || ""} onChange={(e) => setField({ notes: e.target.value })} placeholder="Pickup, delivery, anything the customer should see" />
                : <p className="whitespace-pre-wrap text-sm">{order.notes || "—"}</p>}
            </Field>
          </Panel>
        </div>
      </div>

      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title={`Void ${order.number}`} subtitle="It is kept, marked void. Reserved units go back to stock.">
        <Field label="Why">
          <Input autoFocus value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Customer cancelled" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={() => setVoidOpen(false)}>Keep it</Action>
          <Action solid onClick={doVoid} disabled={!voidReason.trim() || busy === "void"}>Void order</Action>
        </div>
      </Modal>

      <CustomerModal open={addCustomer} onClose={() => setAddCustomer(false)}
        onAdded={(c) => { setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name))); setField({ customer_id: c.id, terms: c.terms }); setAddCustomer(false); }} />
    </PageShell>
  );
}
