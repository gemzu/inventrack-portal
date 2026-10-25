"use client";

/**
 * One sales invoice. The sheet on the left is the document as the customer
 * gets it (the PDF is drawn from the same data); the panel on the right is
 * what the person here needs: how much, when, and what to do next.
 *
 * Every change goes through a server function (paid, not paid, void); the
 * invoice itself is never edited. A correction is Void plus a new invoice
 * from the order.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRight, Download, Loader2, Mail, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import { Panel, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Modal, Select, Textarea } from "@/components/console/controls";
import InvoiceSheet from "@/components/sales/InvoiceSheet";
import {
  fmtDate, fmtMoney, invoiceState, markInvoicePaid, markInvoiceUnpaid, PAY_METHOD_LABEL, todayIso, voidInvoice, why,
  type PayMethod, type SalesInvoice, type SalesInvoiceLine,
} from "@/lib/sales";

export default function SalesInvoicePage() {
  return (
    <SalesGuard>
      <InvoiceView />
    </SalesGuard>
  );
}

function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [inv, setInv] = useState<SalesInvoice | null>(null);
  const [lines, setLines] = useState<SalesInvoiceLine[]>([]);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [pay, setPay] = useState<{ on: string; method: PayMethod | ""; ref: string }>({ on: todayIso(), method: "", ref: "" });
  const [voidReason, setVoidReason] = useState("");
  const [mailOpen, setMailOpen] = useState(false);
  const [note, setNote] = useState("");
  const [copyMe, setCopyMe] = useState(true);
  const [sent, setSent] = useState<{ to_email: string; created_at: string }[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [i, l, m] = await Promise.all([
      supabase.from("sales_invoices").select("*").eq("id", id).maybeSingle(),
      supabase.from("sales_invoice_lines").select("*").eq("invoice_id", id).order("sort"),
      supabase.from("sales_invoice_emails").select("to_email, created_at").eq("invoice_id", id).order("created_at", { ascending: false }),
    ]);
    setSent((m.data || []) as { to_email: string; created_at: string }[]);
    const row = i.data as SalesInvoice | null;
    setInv(row);
    setLines(((l.data || []) as SalesInvoiceLine[]).map((x) => ({
      ...x, quantity: Number(x.quantity), unit_price_cents: Number(x.unit_price_cents), line_cents: Number(x.line_cents),
    })));
    if (row) {
      const { data: o } = await supabase.from("sales_orders").select("number").eq("id", row.order_id).maybeSingle();
      setOrderNumber(o?.number || null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const makePdf = async () => {
    if (!inv) return null;
    const { invoicePdf } = await import("@/components/sales/InvoicePdf");
    return invoicePdf(inv, lines, orderNumber);
  };

  const download = async () => {
    setBusy("pdf");
    try {
      const blob = await makePdf();
      if (!blob || !inv) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.number} ${inv.bill_to_name}.pdf`.replace(/[\\/:*?"<>|]+/g, "-");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast(`PDF not made: ${why(e)}`, "error");
    } finally { setBusy(null); }
  };

  /* Emailed by the server (send-invoice-email): the PDF made here goes along
     as the attachment, and the server sends it only to the billing email the
     invoice carries. */
  const sendEmail = async () => {
    if (!inv) return;
    setBusy("mail");
    try {
      const blob = await makePdf();
      if (!blob) return;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: { invoiceId: inv.id, note: note.trim(), copyMe, pdfBase64: btoa(bin) },
      });
      if (error) {
        let msg = error.message || "The email did not send";
        try { const b = await (error as { context?: Response }).context?.json(); if (b?.error) msg = b.error; } catch { /* keep generic */ }
        throw new Error(msg);
      }
      toast(`Emailed to ${data?.to || inv.bill_to_email}`, "success");
      setMailOpen(false);
      setNote("");
      await load();
    } catch (e) {
      toast(`Not sent: ${why(e)}`, "error");
    } finally { setBusy(null); }
  };

  /* Opened in its own tab, where the browser's PDF viewer prints it exactly. */
  const openToPrint = async () => {
    const tab = window.open("", "_blank");
    setBusy("print");
    try {
      const blob = await makePdf();
      if (!blob) { tab?.close(); return; }
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url; else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      tab?.close();
      toast(`PDF not made: ${why(e)}`, "error");
    } finally { setBusy(null); }
  };

  const doPay = async () => {
    if (!inv || !pay.method) return;
    setBusy("pay");
    try {
      await markInvoicePaid(inv.id, pay.on, pay.method, pay.ref);
      toast(`${inv.number} marked paid`, "success");
      setPayOpen(false);
      await load();
    } catch (e) { toast(why(e), "error"); } finally { setBusy(null); }
  };

  const doUnpay = async () => {
    if (!inv || !confirm(`Remove the payment recorded on ${inv.number}? It goes back to unpaid.`)) return;
    setBusy("unpay");
    try {
      await markInvoiceUnpaid(inv.id);
      toast("Payment removed", "success");
      await load();
    } catch (e) { toast(why(e), "error"); } finally { setBusy(null); }
  };

  const doVoid = async () => {
    if (!inv || !voidReason.trim()) return;
    setBusy("void");
    try {
      await voidInvoice(inv.id, voidReason.trim());
      toast(`${inv.number} voided - the units are reserved for the order again`, "success");
      setVoidOpen(false);
      await load();
    } catch (e) { toast(why(e), "error"); } finally { setBusy(null); }
  };

  if (loading) {
    return (
      <PageShell title="Invoice" subtitle="Opening it.">
        <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
          <CrateSkeleton className="h-[34rem] w-full" />
          <CrateSkeleton className="h-64 w-full" delay={0.08} />
        </div>
      </PageShell>
    );
  }
  if (!inv) {
    return (
      <PageShell title="Invoice" subtitle="Not found, or not yours to see.">
        <Link href="/dashboard/invoices/sales" className="text-sm text-[var(--brand-2)] hover:underline">Back to sales invoices</Link>
      </PageShell>
    );
  }

  const st = invoiceState(inv);
  const issued = inv.status === "issued";

  return (
    <PageShell
      title="Invoice"
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/invoices/sales" className="hover:underline">Sales invoices</Link>
          <span aria-hidden>/</span>
          <span className="mono font-semibold text-foreground">{inv.number}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Action onClick={openToPrint} disabled={!!busy} aria-label="Open the PDF to print">
            {busy === "print" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Print
          </Action>
          {inv.status !== "void" && (
            <Action onClick={() => setMailOpen(true)} disabled={!!busy} aria-label="Email the invoice to the customer">
              <Mail className="h-3.5 w-3.5" /> Email
            </Action>
          )}
          <Action solid={!issued} onClick={download} disabled={!!busy}>
            {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download PDF
          </Action>
          {issued && (
            <Action solid onClick={() => { setPay({ on: todayIso(), method: "", ref: "" }); setPayOpen(true); }} disabled={!!busy}>
              Mark paid
            </Action>
          )}
        </div>
      }
    >
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
        <InvoiceSheet inv={inv} lines={lines} orderNumber={orderNumber} />

        <div className="space-y-4 xl:sticky xl:top-20">
          <Panel className="p-5">
            <p className="text-[12px] text-muted-foreground">{inv.status === "issued" ? "Amount due" : "Total"}</p>
            <p className="font-display mt-1 text-3xl font-bold tracking-[-0.03em] tabular-nums">{fmtMoney(inv.total_cents)}</p>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-[13px]">
              <Row k="Issued" v={fmtDate(inv.issued_on)} />
              <Row k="Due" v={`${fmtDate(inv.due_on)} · ${inv.terms}`} />
              {inv.status === "paid" && (
                <>
                  <Row k="Paid" v={fmtDate(inv.paid_on)} />
                  <Row k="Method" v={inv.paid_method ? PAY_METHOD_LABEL[inv.paid_method] : "—"} />
                  {inv.paid_reference ? <Row k="Reference" v={inv.paid_reference} mono /> : null}
                </>
              )}
              {inv.status === "void" && <Row k="Voided" v={inv.void_reason || "—"} />}
            </dl>
          </Panel>

          {st.key === "overdue" && (
            <p role="status" className="rounded-md bg-destructive/10 p-3 text-[13px] text-destructive">
              {st.label}. {inv.bill_to_email ? <>Billing email: <a className="underline" href={`mailto:${inv.bill_to_email}?subject=${encodeURIComponent(`Invoice ${inv.number}`)}`}>{inv.bill_to_email}</a></> : "No billing email on file for this customer."}
            </p>
          )}

          {sent.length > 0 && (
            <Panel className="p-5 text-[13px]">
              <p className="mb-2 text-[12px] text-muted-foreground">Emailed</p>
              <ul className="space-y-1.5">
                {sent.slice(0, 5).map((m, k) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{m.to_email}</span>
                    <span className="shrink-0 text-muted-foreground">{new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel className="p-5 text-[13px]">
            <dl className="space-y-2">
              <Row k="Customer" v={inv.bill_to_name} />
              <Row k="Billed by" v={inv.from_name} />
              {inv.customer_po ? <Row k="Customer PO" v={inv.customer_po} mono /> : null}
            </dl>
            <Link href={`/dashboard/orders/sales/${inv.order_id}`}
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand-2)] hover:underline">
              Sales order {orderNumber || ""} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>

          {inv.status !== "void" && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {inv.status === "paid" && (
                <Action onClick={doUnpay} disabled={!!busy}>Remove payment</Action>
              )}
              <button onClick={() => { setVoidReason(""); setVoidOpen(true); }} disabled={!!busy}
                className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                Void invoice
              </button>
            </div>
          )}
          {inv.status === "void" && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Kept for the record. The order is back to Sent with its units reserved: invoice it again for a new number, or void the order to release the units.
            </p>
          )}
        </div>
      </div>

      <Modal open={mailOpen} onClose={() => setMailOpen(false)} title={`Email ${inv.number}`}
        subtitle={inv.bill_to_email ? `To ${inv.bill_to_email}, with the PDF attached` : "No billing email on this invoice"}>
        {inv.bill_to_email ? (
          <div className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
              <li>Sent from {inv.from_name}; replies go to {inv.from_email || "support@invems.com"}.</li>
              <li>It always goes to the billing email on the invoice. To use another address, change the customer and issue the invoice again, or use Download PDF.</li>
              {sent.length > 0 ? <li>Already emailed {sent.length} time{sent.length === 1 ? "" : "s"}; the last went to {sent[0].to_email}.</li> : null}
            </ul>
            <Field label="A line for the customer (optional)">
              <Textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thanks for the order. Pickup is ready Friday." />
            </Field>
            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px]">
              <input type="checkbox" checked={copyMe} onChange={(e) => setCopyMe(e.target.checked)} className="h-3.5 w-3.5 cursor-pointer accent-[var(--brand-2)]" />
              Send me a copy
            </label>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            This customer had no billing email when the invoice was issued. Add one on the customer page, void this invoice and issue it again, or send the PDF yourself with Download PDF.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={() => setMailOpen(false)}>Cancel</Action>
          {inv.bill_to_email ? (
            <Action solid onClick={sendEmail} disabled={busy === "mail"}>
              {busy === "mail" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Send email
            </Action>
          ) : null}
        </div>
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Mark ${inv.number} paid`} subtitle={`${fmtMoney(inv.total_cents)} from ${inv.bill_to_name}`}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment arrived">
              <Input type="date" value={pay.on} max={todayIso()} onChange={(e) => setPay({ ...pay, on: e.target.value })} />
            </Field>
            <Field label="How">
              <Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as PayMethod })} aria-label="Payment method">
                <option value="">Choose</option>
                {(Object.keys(PAY_METHOD_LABEL) as PayMethod[]).map((m) => <option key={m} value={m}>{PAY_METHOD_LABEL[m]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Reference (optional)" hint="Check number, wire or ACH trace - whatever finds it in the bank later.">
            <Input value={pay.ref} maxLength={200} onChange={(e) => setPay({ ...pay, ref: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={() => setPayOpen(false)}>Cancel</Action>
          <Action solid onClick={doPay} disabled={!pay.method || !pay.on || busy === "pay"}>
            {busy === "pay" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Mark paid
          </Action>
        </div>
      </Modal>

      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title={`Void ${inv.number}`}
        subtitle="It is kept, marked void, and its number is never reused.">
        <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
          <li>The units go back to reserved for order {orderNumber}.</li>
          <li>The order goes back to Sent, ready for a corrected invoice.</li>
          {inv.status === "paid" ? <li>The payment stays on record with the void invoice.</li> : null}
        </ul>
        <Field label="Why">
          <Input autoFocus value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Wrong quantity" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={() => setVoidOpen(false)}>Keep it</Action>
          <button onClick={doVoid} disabled={!voidReason.trim() || busy === "void"}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "void" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Void invoice
          </button>
        </div>
      </Modal>
    </PageShell>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={`text-right ${mono ? "mono" : ""}`}>{v}</dd>
    </div>
  );
}
