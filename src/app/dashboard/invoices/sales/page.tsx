"use client";

/**
 * Sales invoices: what has been billed, what is owed, what is late.
 * Invoices are issued from a sent sales order (phase 2); this is the list.
 * Storefront invoices stay on /dashboard/invoices.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Figure, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Chip, SearchInput } from "@/components/console/controls";
import { fmtDate, fmtMoney, invoiceState, todayIso, type SalesInvoice } from "@/lib/sales";

type Filter = "all" | "unpaid" | "overdue" | "paid" | "void";

export default function SalesInvoicesPage() {
  return (
    <SalesGuard>
      <SalesInvoices />
    </SalesGuard>
  );
}

function SalesInvoices() {
  const { orgId } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!orgId) return;
    supabase.from("sales_invoices").select("*").eq("org_id", orgId)
      .order("issued_on", { ascending: false }).order("number", { ascending: false }).limit(2000)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        setRows((data || []) as SalesInvoice[]);
        setLoading(false);
      });
  }, [orgId]);

  const today = todayIso();
  const withState = useMemo(() => rows.map((r) => ({ ...r, st: invoiceState(r, today) })), [rows, today]);
  const unpaid = withState.filter((r) => r.status === "issued");
  const overdue = unpaid.filter((r) => r.st.key === "overdue");
  const month = today.slice(0, 7);
  const paidThisMonth = withState.filter((r) => r.status === "paid" && (r.paid_on || "").startsWith(month));
  const sum = (xs: { total_cents: number }[]) => xs.reduce((n, r) => n + Number(r.total_cents || 0), 0);

  const count: Record<Filter, number> = {
    all: withState.length, unpaid: unpaid.length, overdue: overdue.length,
    paid: withState.filter((r) => r.status === "paid").length, void: withState.filter((r) => r.status === "void").length,
  };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withState.filter((r) =>
      (filter === "all" || (filter === "unpaid" ? r.status === "issued" : filter === "overdue" ? r.st.key === "overdue" : r.status === filter)) &&
      (!q || `${r.number} ${r.bill_to_name} ${r.from_name} ${r.customer_po || ""}`.toLowerCase().includes(q)));
  }, [withState, search, filter]);

  if (loading) {
    return (
      <PageShell title="Sales invoices" subtitle="Reading the book.">
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <CrateSkeleton key={i} className="h-14 w-full" delay={i * 0.06} />)}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Sales invoices"
      subtitle="Issued from sent sales orders. Open one to download, print, or record the payment."
      actions={
        <Link href="/dashboard/orders/sales" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
          Sales orders
        </Link>
      }
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label="Owed to you" value={fmtMoney(sum(unpaid))} />
          <Figure label={`Overdue · ${overdue.length}`} value={fmtMoney(sum(overdue))} tone={overdue.length ? "destructive" : undefined} />
          <Figure label="Paid this month" value={fmtMoney(sum(paidThisMonth))} />
        </div>

        <div className="space-y-4">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")}
            placeholder="Invoice number, customer, company or PO" aria-label="Search sales invoices" />
          <div className="flex flex-wrap items-center gap-2">
            {([["all", "Any"], ["unpaid", "Unpaid"], ["overdue", "Overdue"], ["paid", "Paid"], ["void", "Void"]] as [Filter, string][]).map(([k, label]) => (
              <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{label} · {count[k]}</Chip>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">Could not load invoices: {error}</p> : null}

        <Panel className="reveal">
          <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
            <ColHead className="w-36 shrink-0">Invoice</ColHead>
            <ColHead className="min-w-0 flex-1">Customer</ColHead>
            <ColHead className="w-28 shrink-0">Issued</ColHead>
            <ColHead className="w-28 shrink-0 text-right">Total</ColHead>
            <ColHead className="w-36 shrink-0">State</ColHead>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={Receipt} title={rows.length ? "Nothing matches" : "No sales invoices yet"}
              description={rows.length ? "Try another search or filter." : "Open a sent sales order and choose Create invoice."} />
          ) : shown.map((r) => (
            <button key={r.id} onClick={() => router.push(`/dashboard/invoices/sales/${r.id}`)}
              className="row-line flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left md:flex-nowrap">
              <span className="mono w-36 shrink-0 text-[13px] font-semibold">{r.number}</span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {r.bill_to_name}
                <span className="text-muted-foreground"> · {r.from_name}{r.customer_po ? ` · PO ${r.customer_po}` : ""}</span>
              </span>
              <span className="hidden w-28 shrink-0 text-[13px] text-muted-foreground md:block">{fmtDate(r.issued_on)}</span>
              <span className="mono w-28 shrink-0 text-right text-sm font-semibold tabular-nums">{fmtMoney(r.total_cents)}</span>
              <span className="w-36 shrink-0"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.st.tone}`}>{r.st.label}</span></span>
            </button>
          ))}
        </Panel>
      </div>
    </PageShell>
  );
}
