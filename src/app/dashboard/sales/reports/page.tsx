"use client";

/**
 * Money reports: billed and received by month, who owes what, how late the
 * unpaid money is, missing W-9s, and the CSV files for the accountant.
 * The numbers come from sales_report on the server, worked out from the
 * invoices themselves, so they always agree with the invoice list.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import { Panel, Figure, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Field, Input, Select } from "@/components/console/controls";
import MonthBars from "@/components/sales/MonthBars";
import {
  centsPlain, fmtDate, fmtMoney, PAY_METHOD_LABEL, salesReport, saveFile, todayIso, toCsv, why,
  type BillingCompany, type SalesInvoice, type SalesInvoiceLine, type SalesReport,
} from "@/lib/sales";

type Preset = "month" | "3m" | "year" | "12m" | "custom";
type SortKey = "name" | "billed" | "paid" | "owed" | "overdue";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function rangeOf(p: Exclude<Preset, "custom">): [string, string] {
  const now = new Date();
  const to = iso(now);
  if (p === "month") return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), to];
  if (p === "3m") return [iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to];
  if (p === "year") return [iso(new Date(now.getFullYear(), 0, 1)), to];
  return [iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to];
}

const AGE: { key: keyof SalesReport["ageing"]; label: string; tone: string }[] = [
  { key: "current", label: "Not due yet", tone: "bg-[#0f8fa6] dark:bg-[#23a3b8]" },
  { key: "d1_30", label: "1-30 days late", tone: "bg-amber-400" },
  { key: "d31_60", label: "31-60 days late", tone: "bg-orange-500" },
  { key: "d61_90", label: "61-90 days late", tone: "bg-red-500" },
  { key: "d90", label: "Over 90 days late", tone: "bg-red-800" },
];

export default function SalesReportsPage() {
  return (
    <SalesGuard>
      <Reports />
    </SalesGuard>
  );
}

function Reports() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [preset, setPreset] = useState<Preset>("12m");
  const [[from, to], setRange] = useState<[string, string]>(rangeOf("12m"));
  const [company, setCompany] = useState("");
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [rep, setRep] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "owed", desc: true });
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("billing_companies").select("*").eq("org_id", orgId).order("name")
      .then(({ data }) => setCompanies((data || []) as BillingCompany[]));
  }, [orgId]);

  const run = useCallback(async () => {
    if (!from || !to || to < from) return;
    setLoading(true);
    try {
      setRep(await salesReport(from, to, company || null));
      setError(null);
    } catch (e) { setError(why(e)); } finally { setLoading(false); }
  }, [from, to, company]);

  useEffect(() => { run(); }, [run]);

  const pick = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(rangeOf(p));
  };

  const customers = useMemo(() => {
    const list = [...(rep?.customers || [])];
    list.sort((a, b) => {
      const v = sort.key === "name" ? a.name.localeCompare(b.name) : Number(a[sort.key]) - Number(b[sort.key]);
      return sort.desc ? -v : v;
    });
    return list;
  }, [rep, sort]);

  const ageTotal = rep ? AGE.reduce((n, a) => n + Number(rep.ageing[a.key].cents), 0) : 0;
  const companyName = companies.find((c) => c.id === company)?.name;
  const fileTag = `${from}_to_${to}${companyName ? `_${companyName.replace(/[^\w]+/g, "-")}` : ""}`;

  /* Same range and company as the report. Void invoices are included and
     marked, so the accountant sees every number that was issued. */
  async function invoicesInRange() {
    let q = supabase.from("sales_invoices").select("*").eq("org_id", orgId!).gte("issued_on", from).lte("issued_on", to)
      .order("issued_on").order("number").limit(20000);
    if (company) q = q.eq("billing_company_id", company);
    const { data, error: e } = await q;
    if (e) throw new Error(e.message);
    return (data || []) as SalesInvoice[];
  }

  const exportInvoices = async () => {
    setExporting("inv");
    try {
      const rows = await invoicesInRange();
      saveFile(toCsv(
        ["Invoice", "Billed by", "Customer", "Customer PO", "Issued", "Due", "Terms", "Subtotal", "Freight", "Tax", "Tax rate %", "Total", "Status", "Paid on", "Method", "Payment ref", "Void reason"],
        rows.map((i) => [i.number, i.from_name, i.bill_to_name, i.customer_po, i.issued_on, i.due_on, i.terms,
          centsPlain(i.subtotal_cents), centsPlain(i.freight_cents), centsPlain(i.tax_cents), i.tax_rate != null ? String(Number(i.tax_rate)) : "", centsPlain(i.total_cents),
          i.status === "issued" ? "unpaid" : i.status, i.paid_on, i.paid_method ? PAY_METHOD_LABEL[i.paid_method] : "", i.paid_reference, i.void_reason]),
      ), `invoices_${fileTag}.csv`);
      toast(`${rows.length} invoice${rows.length === 1 ? "" : "s"} exported`, "success");
    } catch (e) { toast(`Not exported: ${why(e)}`, "error"); } finally { setExporting(null); }
  };

  const exportLines = async () => {
    setExporting("lines");
    try {
      const invs = await invoicesInRange();
      const byId = new Map(invs.map((i) => [i.id, i]));
      const lines: (SalesInvoiceLine & { invoice_id: string })[] = [];
      for (let k = 0; k < invs.length; k += 200) {
        const { data, error: e } = await supabase.from("sales_invoice_lines").select("*")
          .in("invoice_id", invs.slice(k, k + 200).map((i) => i.id)).order("sort");
        if (e) throw new Error(e.message);
        lines.push(...((data || []) as (SalesInvoiceLine & { invoice_id: string })[]));
      }
      const rows = lines
        .sort((a, b) => (byId.get(a.invoice_id)!.number).localeCompare(byId.get(b.invoice_id)!.number) || a.sort - b.sort)
        .map((l) => {
          const i = byId.get(l.invoice_id)!;
          return [i.number, i.issued_on, i.bill_to_name, l.description, l.part_number, l.brand, l.quantity,
            centsPlain(l.unit_price_cents), centsPlain(l.line_cents), i.status === "issued" ? "unpaid" : i.status];
        });
      saveFile(toCsv(["Invoice", "Issued", "Customer", "Description", "Part number", "Brand", "Quantity", "Unit price", "Amount", "Invoice status"], rows),
        `invoice-lines_${fileTag}.csv`);
      toast(`${rows.length} line${rows.length === 1 ? "" : "s"} exported`, "success");
    } catch (e) { toast(`Not exported: ${why(e)}`, "error"); } finally { setExporting(null); }
  };

  const head = (key: SortKey, label: string, right = true) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}
      className={`py-2 font-medium ${right ? "text-right" : "text-left"}`}>
      <button onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : key !== "name" })}
        className={`inline-flex items-center gap-1 hover:text-foreground ${sort.key === key ? "text-foreground" : ""}`}>
        {label}{sort.key === key ? (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : null}
      </button>
    </th>
  );

  return (
    <PageShell
      title="Money reports"
      subtitle="What was billed, what came in, and who still owes. Sale prices only."
      actions={
        <div className="flex flex-wrap gap-2">
          <Action onClick={exportInvoices} disabled={!!exporting}>
            {exporting === "inv" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Invoices CSV
          </Action>
          <Action onClick={exportLines} disabled={!!exporting}>
            {exporting === "lines" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Lines CSV
          </Action>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Filters, one row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {([["month", "This month"], ["3m", "Last 3 months"], ["year", "This year"], ["12m", "Last 12 months"], ["custom", "Dates…"]] as [Preset, string][]).map(([k, l]) => (
              <Chip key={k} on={preset === k} onClick={() => pick(k)}>{l}</Chip>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex flex-wrap gap-2">
              <Field label="From"><Input type="date" value={from} max={to} onChange={(e) => e.target.value && setRange([e.target.value, to])} /></Field>
              <Field label="To"><Input type="date" value={to} min={from} max={todayIso()} onChange={(e) => e.target.value && setRange([from, e.target.value])} /></Field>
            </div>
          )}
          {companies.length > 1 && (
            <Select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Billing company" className="w-auto">
              <option value="">All billing companies</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <p className="ml-auto text-[12px] text-muted-foreground">{fmtDate(from)} – {fmtDate(to)}{companyName ? ` · ${companyName}` : ""}</p>
        </div>

        {error ? <p className="text-sm text-destructive">Report not loaded: {error}</p> : null}

        {!rep && loading ? (
          <div className="space-y-3"><CrateSkeleton className="h-20 w-full" /><CrateSkeleton className="h-64 w-full" delay={0.06} /></div>
        ) : rep ? (
          <div className={`space-y-8 transition-opacity ${loading ? "opacity-60" : ""}`}>
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label={`Billed · ${rep.totals.invoices} invoice${rep.totals.invoices === 1 ? "" : "s"}`} value={fmtMoney(rep.totals.billed)} />
              <Figure label="Received" value={fmtMoney(rep.totals.received)} />
              <Figure label="Owed now" value={fmtMoney(rep.totals.owed_now)} />
              <Figure label="Overdue now" value={fmtMoney(rep.totals.overdue_now)} tone={rep.totals.overdue_now ? "destructive" : undefined} />
            </div>

            <Panel className="p-5">
              <p className="font-display mb-3 text-base font-bold">By month</p>
              <MonthBars rows={rep.months.map((m) => ({ ...m, billed: Number(m.billed), received: Number(m.received), invoices: Number(m.invoices) }))} />
            </Panel>

            <div className="grid items-start gap-5 xl:grid-cols-[1fr_22rem]">
              <Panel className="p-5">
                <p className="font-display mb-3 text-base font-bold">By customer</p>
                {customers.length === 0 ? <p className="text-[13px] text-muted-foreground">No invoices in this range.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead><tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                        {head("name", "Customer", false)}{head("billed", "Billed")}{head("paid", "Paid")}{head("owed", "Owed")}{head("overdue", "Overdue")}
                      </tr></thead>
                      <tbody>
                        {customers.map((c) => (
                          <tr key={c.id} className="border-b border-border/60">
                            <td className="py-2 pr-3"><Link href={`/dashboard/sales/customers/${c.id}`} className="hover:underline">{c.name}</Link>
                              <span className="ml-1.5 text-[11px] text-muted-foreground">{c.invoices}</span></td>
                            <td className="mono py-2 text-right tabular-nums">{fmtMoney(c.billed)}</td>
                            <td className="mono py-2 text-right tabular-nums">{fmtMoney(c.paid)}</td>
                            <td className="mono py-2 text-right tabular-nums">{fmtMoney(c.owed)}</td>
                            <td className={`mono py-2 text-right tabular-nums ${Number(c.overdue) ? "font-semibold text-destructive" : ""}`}>{fmtMoney(c.overdue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <div className="space-y-5">
                <Panel className="p-5">
                  <p className="font-display text-base font-bold">How late the unpaid money is</p>
                  <p className="mb-3 text-[12px] text-muted-foreground">Today, every unpaid invoice{companyName ? ` of ${companyName}` : ""}.</p>
                  {ageTotal > 0 ? (
                    <div className="mb-3 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
                      {AGE.map((a) => Number(rep.ageing[a.key].cents) > 0 ? (
                        <span key={a.key} className={a.tone} style={{ width: `${(Number(rep.ageing[a.key].cents) / ageTotal) * 100}%` }} />
                      ) : null)}
                    </div>
                  ) : null}
                  <ul className="space-y-1.5 text-[13px]">
                    {AGE.map((a) => (
                      <li key={a.key} className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${a.tone}`} />
                        <span className="flex-1">{a.label}</span>
                        <span className="text-[11px] text-muted-foreground">{rep.ageing[a.key].count}</span>
                        <span className="mono w-24 text-right tabular-nums">{fmtMoney(rep.ageing[a.key].cents)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard/invoices/sales" className="mt-3 inline-block text-[13px] font-medium text-[var(--brand-2)] hover:underline">Open the invoices</Link>
                </Panel>

                <Panel className="p-5">
                  <p className="font-display text-base font-bold">No W-9 on file</p>
                  <p className="mb-3 text-[12px] text-muted-foreground">Customers billed this year.</p>
                  {rep.missing_w9.length === 0 ? <p className="text-[13px] text-muted-foreground">None missing.</p> : (
                    <ul className="space-y-1.5 text-[13px]">
                      {rep.missing_w9.map((c) => (
                        <li key={c.id} className="flex justify-between gap-3">
                          <Link href={`/dashboard/sales/customers/${c.id}`} className="truncate hover:underline">{c.name}</Link>
                          <span className="mono tabular-nums text-muted-foreground">{fmtMoney(c.billed)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
