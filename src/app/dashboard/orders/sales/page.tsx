"use client";

/**
 * Sales orders: stock sold to a customer, billed by one of the account's
 * companies (phase 1 of the owner's request, 2026-10-22). Created from a
 * selection on Inventory; this is the list.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Figure, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Chip, SearchInput } from "@/components/console/controls";
import { fmtMoney, STATUS_LABEL, STATUS_TONE, type SalesOrder, type SalesStatus } from "@/lib/sales";

type Row = SalesOrder & { customer_name: string; company_name: string; lines: number };


export default function SalesOrdersPage() {
  return (
    <SalesGuard>
      <SalesOrders />
    </SalesGuard>
  );
}

function SalesOrders() {
  const { orgId } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SalesStatus | "all">("all");

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [o, c, b, l] = await Promise.all([
        supabase.from("sales_orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1000),
        supabase.from("customers").select("id, name").eq("org_id", orgId),
        supabase.from("billing_companies").select("id, name").eq("org_id", orgId),
        supabase.from("sales_order_lines").select("order_id").eq("org_id", orgId).limit(10000),
      ]);
      if (o.error) { setError(o.error.message); setLoading(false); return; }
      const cust = new Map((c.data || []).map((x) => [x.id, x.name as string]));
      const comp = new Map((b.data || []).map((x) => [x.id, x.name as string]));
      const count = new Map<string, number>();
      for (const x of l.data || []) count.set(x.order_id, (count.get(x.order_id) || 0) + 1);
      setRows((o.data || []).map((x) => ({
        ...(x as SalesOrder),
        customer_name: x.customer_id ? cust.get(x.customer_id) || "Unknown customer" : "No customer yet",
        company_name: comp.get(x.billing_company_id) || "",
        lines: count.get(x.id) || 0,
      })));
      setLoading(false);
    })();
  }, [orgId]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (status === "all" || r.status === status) &&
      (!q || `${r.number} ${r.customer_name} ${r.company_name} ${r.customer_po || ""}`.toLowerCase().includes(q)));
  }, [rows, search, status]);
  const open = rows.filter((r) => r.status === "draft" || r.status === "sent");
  const openValue = open.reduce((n, r) => n + Number(r.total_cents || 0), 0);

  if (loading) {
    return (
      <PageShell title="Sales orders" subtitle="Reading the book.">
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <CrateSkeleton key={i} className="h-14 w-full" delay={i * 0.06} />)}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Sales orders"
      subtitle="Stock you sell to a customer. Start one by selecting items on Inventory."
      actions={
        <Link href="/dashboard/inventory" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)]">
          Select items on Inventory
        </Link>
      }
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label="Open orders" value={open.length} />
          <Figure label="Open value" value={fmtMoney(openValue)} />
        </div>

        <div className="space-y-4">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")}
            placeholder="Order number, customer, company or PO" aria-label="Search sales orders" />
          <div className="flex flex-wrap items-center gap-2">
            <Chip on={status === "all"} onClick={() => setStatus("all")}>Any state</Chip>
            {(["draft", "sent", "void"] as SalesStatus[]).map((s) => (
              <Chip key={s} on={status === s} onClick={() => setStatus(s)}>
                {STATUS_LABEL[s]} · {rows.filter((r) => r.status === s).length}
              </Chip>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">Could not load sales orders: {error}</p> : null}

        <Panel className="reveal">
          <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
            <ColHead className="w-36 shrink-0">Order</ColHead>
            <ColHead className="min-w-0 flex-1">Customer</ColHead>
            <ColHead className="w-44 shrink-0">Billed by</ColHead>
            <ColHead className="w-16 shrink-0 text-right">Lines</ColHead>
            <ColHead className="w-28 shrink-0 text-right">Total</ColHead>
            <ColHead className="w-24 shrink-0">State</ColHead>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={FileText} title={rows.length ? "Nothing matches" : "No sales orders yet"}
              description={rows.length ? "Try another search or state." : "Select items on Inventory, then Create sales order."} />
          ) : shown.map((r) => (
            <button key={r.id} onClick={() => router.push(`/dashboard/orders/sales/${r.id}`)}
              className="row-line flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left md:flex-nowrap">
              <span className="mono w-36 shrink-0 text-[13px] font-semibold">{r.number}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{r.customer_name}{r.customer_po ? <span className="text-muted-foreground"> · PO {r.customer_po}</span> : null}</span>
              <span className="hidden w-44 shrink-0 truncate text-[13px] text-muted-foreground md:block">{r.company_name}</span>
              <span className="mono hidden w-16 shrink-0 text-right text-[13px] tabular-nums md:block">{r.lines}</span>
              <span className="mono w-28 shrink-0 text-right text-sm font-semibold tabular-nums">{fmtMoney(r.total_cents)}</span>
              <span className="w-24 shrink-0"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span></span>
            </button>
          ))}
        </Panel>
      </div>
    </PageShell>
  );
}
