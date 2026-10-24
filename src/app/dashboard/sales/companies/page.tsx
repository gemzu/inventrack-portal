"use client";

/**
 * Billing companies: the businesses in this account that send orders and
 * invoices (several can bill under one account). Their letterhead, logo and
 * payment details go on every new invoice; issued invoices keep the details
 * they were issued with. "Preview invoice" draws a sample PDF with the
 * details on screen, saved or not, before a real one goes out.
 */

import { useEffect, useMemo, useState } from "react";
import { Eye, Landmark, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Field, Input, Textarea } from "@/components/console/controls";
import { CompanyModal } from "@/components/sales/SalesModals";
import { dueFromTerms, todayIso, why, type BillingCompany, type SalesInvoice, type SalesInvoiceLine } from "@/lib/sales";

type Form = { name: string; address: string; email: string; phone: string; invoice_prefix: string; logo_url: string; payment_details: string };
const toForm = (c: BillingCompany): Form => ({
  name: c.name || "", address: c.address || "", email: c.email || "", phone: c.phone || "",
  invoice_prefix: c.invoice_prefix || "INV", logo_url: c.logo_url || "", payment_details: c.payment_details || "",
});

export default function CompaniesPage() {
  return (
    <SalesGuard>
      <Companies />
    </SalesGuard>
  );
}

function Companies() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<BillingCompany[]>([]);
  const [issued, setIssued] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [logoOk, setLogoOk] = useState(true);

  const load = async (keep?: string) => {
    if (!orgId) return;
    const [b, i] = await Promise.all([
      supabase.from("billing_companies").select("*").eq("org_id", orgId).order("name"),
      supabase.from("sales_invoices").select("billing_company_id").eq("org_id", orgId).limit(10000),
    ]);
    const list = (b.data || []) as BillingCompany[];
    const count: Record<string, number> = {};
    for (const r of i.data || []) count[r.billing_company_id] = (count[r.billing_company_id] || 0) + 1;
    setRows(list);
    setIssued(count);
    const pick = list.find((x) => x.id === keep) || list.find((x) => !x.archived) || list[0] || null;
    setSel(pick?.id || null);
    setF(pick ? toForm(pick) : null);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [orgId]);

  const current = rows.find((r) => r.id === sel) || null;
  const visible = useMemo(() => rows.filter((r) => showArchived || !r.archived), [rows, showArchived]);
  const dirty = !!current && !!f && JSON.stringify(toForm(current)) !== JSON.stringify(f);
  const prefix = (f?.invoice_prefix || "").trim().toUpperCase();
  const prefixLocked = !!current && (issued[current.id] || 0) > 0;
  const prefixBad = !/^[A-Z0-9]{1,8}$/.test(prefix);
  const logoBad = !!f?.logo_url.trim() && !/^https:\/\//.test(f.logo_url.trim());

  const choose = (r: BillingCompany) => {
    if (dirty && !confirm("Leave without saving the changes to this company?")) return;
    setSel(r.id);
    setF(toForm(r));
    setLogoOk(true);
  };

  const save = async () => {
    if (!current || !f || !f.name.trim() || prefixBad || logoBad) return;
    setSaving(true);
    const { error } = await supabase.from("billing_companies").update({
      name: f.name.trim(), address: f.address.trim() || null, email: f.email.trim() || null, phone: f.phone.trim() || null,
      invoice_prefix: prefixLocked ? current.invoice_prefix : prefix, logo_url: f.logo_url.trim() || null,
      payment_details: f.payment_details.trim() || null, updated_at: new Date().toISOString(),
    }).eq("id", current.id);
    setSaving(false);
    if (error) { toast(`Not saved: ${error.message}`, "error"); return; }
    toast("Company saved. New invoices use these details.", "success");
    await load(current.id);
  };

  const setArchived = async (archived: boolean) => {
    if (!current) return;
    if (archived && !confirm(`Archive ${current.name}? It can no longer start new orders; its orders and invoices stay.`)) return;
    const { error } = await supabase.from("billing_companies").update({ archived, updated_at: new Date().toISOString() }).eq("id", current.id);
    if (error) { toast(error.message, "error"); return; }
    await load(current.id);
  };

  /* A sample invoice with the details as typed, in a new tab. */
  const preview = async () => {
    if (!f) return;
    const tab = window.open("", "_blank");
    setPreviewing(true);
    try {
      const today = todayIso();
      const lines: SalesInvoiceLine[] = [
        { id: "1", sort: 1, description: "Front brake pad set", brand: "Sample brand", part_number: "SAMPLE-410", quantity: 4, unit_price_cents: 4800, line_cents: 19200 },
        { id: "2", sort: 2, description: "Rear brake shoes", brand: "Sample brand", part_number: "SAMPLE-221", quantity: 12, unit_price_cents: 3150, line_cents: 37800 },
      ];
      const inv: SalesInvoice = {
        id: "preview", order_id: "", billing_company_id: current?.id || "", customer_id: "", status: "issued",
        number: `${prefixLocked && current ? current.invoice_prefix : prefix || "INV"}-${today.slice(0, 4)}-0000`,
        issued_on: today, due_on: dueFromTerms("Net 30", today), terms: "Net 30", customer_po: "SAMPLE",
        notes: "This is a preview with sample lines. It is not an invoice.",
        bill_to_name: "Sample Customer LLC", bill_to_contact: "Accounts Payable", bill_to_address: "1 Sample St\nAnytown NJ 00000", bill_to_email: "ap@example.com",
        from_name: f.name.trim() || "Your company", from_address: f.address.trim() || null, from_email: f.email.trim() || null,
        from_phone: f.phone.trim() || null, from_logo_url: logoBad ? null : f.logo_url.trim() || null,
        payment_details: f.payment_details.trim() || null,
        subtotal_cents: 57000, freight_cents: 2500, total_cents: 59500,
        paid_on: null, paid_method: null, paid_reference: null, void_reason: null, created_at: today,
      };
      const { invoicePdf } = await import("@/components/sales/InvoicePdf");
      const url = URL.createObjectURL(await invoicePdf(inv, lines, "SO-SAMPLE"));
      if (tab) tab.location.href = url; else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      tab?.close();
      toast(`Preview not made: ${why(e)}`, "error");
    } finally { setPreviewing(false); }
  };

  if (loading) {
    return (
      <PageShell title="Billing companies" subtitle="Reading the book.">
        <CrateSkeleton className="h-72 w-full" />
      </PageShell>
    );
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(f ? { ...f, [k]: e.target.value } : f);

  return (
    <PageShell
      title="Billing companies"
      subtitle="Your businesses that send orders and invoices. What you set here goes on every new invoice."
      actions={<Action solid onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> Add company</Action>}
    >
      {rows.length === 0 ? (
        <EmptyState icon={Landmark} title="No billing companies yet" description="Add the business that sends your invoices. You can add more than one." />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3">
            <Panel>
              {visible.map((r) => (
                <button key={r.id} onClick={() => choose(r)} aria-current={r.id === sel ? "true" : undefined}
                  className={`row-line flex w-full items-center gap-3 px-4 py-3 text-left ${r.id === sel ? "bg-[color-mix(in_oklab,var(--brand-2)_10%,transparent)]" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="mono block text-[11px] text-muted-foreground">{r.invoice_prefix}-… · {issued[r.id] || 0} invoice{issued[r.id] === 1 ? "" : "s"}</span>
                  </span>
                  {r.archived ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">Archived</span> : null}
                </button>
              ))}
            </Panel>
            {rows.some((r) => r.archived) ? (
              <Chip on={showArchived} onClick={() => setShowArchived(!showArchived)}>Show archived</Chip>
            ) : null}
          </div>

          {current && f ? (
            <Panel className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Company name (as it should appear on invoices)"><Input value={f.name} onChange={set("name")} /></Field>
                <Field label="Invoice prefix"
                  hint={prefixLocked ? `Fixed: ${current.name} has issued invoices with it.` : prefixBad ? "1 to 8 letters or numbers." : `Invoices will be numbered ${prefix}-${new Date().getFullYear()}-0001 and up.`}>
                  <Input value={f.invoice_prefix} maxLength={8} onChange={set("invoice_prefix")} disabled={prefixLocked}
                    aria-invalid={!prefixLocked && prefixBad} className={`mono uppercase ${!prefixLocked && prefixBad ? "border-destructive" : ""}`} />
                </Field>
                <Field label="Email"><Input type="email" value={f.email} onChange={set("email")} /></Field>
                <Field label="Phone"><Input type="tel" value={f.phone} onChange={set("phone")} /></Field>
              </div>
              <Field label="Address"><Textarea rows={2} value={f.address} onChange={set("address")} /></Field>
              <div className="grid items-start gap-4 md:grid-cols-[1fr_9rem]">
                <Field label="Logo link (PNG or JPG)" hint={logoBad ? "The link must start with https://" : "Printed at the top of the invoice. Leave empty for the name only."}>
                  <Input value={f.logo_url} onChange={(e) => { set("logo_url")(e); setLogoOk(true); }} placeholder="https://" aria-invalid={logoBad} className={logoBad ? "border-destructive" : ""} />
                </Field>
                <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-white p-2">
                  {f.logo_url.trim() && !logoBad && logoOk
                    // eslint-disable-next-line @next/next/no-img-element -- the owner's own link, any host
                    ? <img src={f.logo_url.trim()} alt={`${f.name} logo preview`} className="max-h-16 max-w-full object-contain" onError={() => setLogoOk(false)} />
                    : <span className="text-center text-[11px] text-neutral-500">{logoOk ? "No logo" : "Could not load that image"}</span>}
                </div>
              </div>
              <Field label="How to pay (printed on unpaid invoices)" hint="Typed by you and stored only on this company. Shown to customers on their invoice.">
                <Textarea rows={4} maxLength={1000} value={f.payment_details} onChange={set("payment_details")} />
              </Field>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Action solid onClick={save} disabled={!dirty || saving || !f.name.trim() || (!prefixLocked && prefixBad) || logoBad}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save changes
                </Action>
                <Action onClick={preview} disabled={previewing}>
                  {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Preview invoice
                </Action>
                <span className="flex-1" />
                <Action onClick={() => setArchived(!current.archived)}>{current.archived ? "Unarchive" : "Archive"}</Action>
              </div>
              {dirty ? <p className="text-[12px] text-muted-foreground">Unsaved changes. The preview uses what is on screen.</p> : null}
            </Panel>
          ) : null}
        </div>
      )}

      <CompanyModal open={adding} onClose={() => setAdding(false)} onAdded={(c) => { setAdding(false); load(c.id); }} />
    </PageShell>
  );
}
