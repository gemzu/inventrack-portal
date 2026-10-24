"use client";

/**
 * Customers: who is billed, and where each one stands - billed, paid, owed,
 * overdue, W-9. The money comes from the issued invoices (void ones left
 * out), so it always matches the invoices list.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Contact, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import SalesGuard from "@/components/SalesGuard";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Figure, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Chip, SearchInput } from "@/components/console/controls";
import { CustomerModal } from "@/components/sales/SalesModals";
import { balances, fmtDate, fmtMoney, type Balance, type Customer, type SalesInvoice } from "@/lib/sales";

type Filter = "active" | "owes" | "overdue" | "now9" | "archived";
const EMPTY: Balance = { billed: 0, paid: 0, owed: 0, overdue: 0, lastIssued: null, invoices: 0 };

export default function CustomersPage() {
  return (
    <SalesGuard>
      <Customers />
    </SalesGuard>
  );
}

function Customers() {
  const { orgId } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Pick<SalesInvoice, "customer_id" | "status" | "total_cents" | "due_on" | "issued_on">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("customers").select("*").eq("org_id", orgId).order("name"),
      supabase.from("sales_invoices").select("customer_id, status, total_cents, due_on, issued_on").eq("org_id", orgId).limit(10000),
    ]).then(([c, i]) => {
      if (c.error) setError(c.error.message);
      setCustomers((c.data || []) as Customer[]);
      setInvoices((i.data || []) as typeof invoices);
      setLoading(false);
    });
  }, [orgId]);

  const bal = useMemo(() => balances(invoices), [invoices]);
  const of = (id: string) => bal.get(id) || EMPTY;
  const active = customers.filter((c) => !c.archived);
  const billedThisYear = (c: Customer) => (of(c.id).lastIssued || "").startsWith(String(new Date().getFullYear()));

  const tests: Record<Filter, (c: Customer) => boolean> = {
    active: (c) => !c.archived,
    owes: (c) => !c.archived && of(c.id).owed > 0,
    overdue: (c) => !c.archived && of(c.id).overdue > 0,
    now9: (c) => !c.archived && !c.w9_url,
    archived: (c) => c.archived,
  };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => tests[filter](c) &&
      (!q || `${c.name} ${c.contact_name || ""} ${c.email || ""}`.toLowerCase().includes(q)))
      .sort((a, b) => of(b.id).owed - of(a.id).owed || a.name.localeCompare(b.name));
  }, [customers, search, filter, bal]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalOwed = active.reduce((n, c) => n + of(c.id).owed, 0);
  const totalOverdue = active.reduce((n, c) => n + of(c.id).overdue, 0);
  const missingW9 = active.filter((c) => !c.w9_url && billedThisYear(c)).length;

  if (loading) {
    return (
      <PageShell title="Customers" subtitle="Reading the book.">
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <CrateSkeleton key={i} className="h-14 w-full" delay={i * 0.06} />)}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Customers"
      subtitle="Who you bill, what they owe, and whose paperwork is missing."
      actions={<Action solid onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> Add customer</Action>}
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label="Customers" value={active.length} />
          <Figure label="Owed to you" value={fmtMoney(totalOwed)} />
          <Figure label="Overdue" value={fmtMoney(totalOverdue)} tone={totalOverdue ? "destructive" : undefined} />
          <Figure label="Billed this year, no W-9" value={missingW9} tone={missingW9 ? "warning" : undefined} />
        </div>

        <div className="space-y-4">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")}
            placeholder="Name, contact or email" aria-label="Search customers" />
          <div className="flex flex-wrap items-center gap-2">
            {([["active", "All"], ["owes", "Owes money"], ["overdue", "Overdue"], ["now9", "No W-9"], ["archived", "Archived"]] as [Filter, string][]).map(([k, label]) => (
              <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{label} · {customers.filter(tests[k]).length}</Chip>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">Could not load customers: {error}</p> : null}

        <Panel className="reveal">
          <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
            <ColHead className="min-w-0 flex-1">Customer</ColHead>
            <ColHead className="w-24 shrink-0">W-9</ColHead>
            <ColHead className="w-28 shrink-0 text-right">Billed</ColHead>
            <ColHead className="w-28 shrink-0 text-right">Owed</ColHead>
            <ColHead className="w-32 shrink-0">Last invoice</ColHead>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={Contact} title={customers.length ? "Nothing matches" : "No customers yet"}
              description={customers.length ? "Try another search or filter." : "Add one here, or while creating a sales order."} />
          ) : shown.map((c) => {
            const b = of(c.id);
            return (
              <button key={c.id} onClick={() => router.push(`/dashboard/sales/customers/${c.id}`)}
                className="row-line flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left md:flex-nowrap">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{[c.contact_name, c.email, c.terms].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="w-24 shrink-0">
                  {c.w9_url
                    ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">On file</span>
                    : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Missing</span>}
                </span>
                <span className="mono hidden w-28 shrink-0 text-right text-[13px] tabular-nums md:block">{fmtMoney(b.billed)}</span>
                <span className={`mono w-28 shrink-0 text-right text-sm font-semibold tabular-nums ${b.overdue ? "text-destructive" : ""}`}>
                  {fmtMoney(b.owed)}
                </span>
                <span className="hidden w-32 shrink-0 text-[13px] text-muted-foreground md:block">{b.lastIssued ? fmtDate(b.lastIssued) : "—"}</span>
              </button>
            );
          })}
        </Panel>
      </div>

      <CustomerModal open={adding} onClose={() => setAdding(false)}
        onAdded={(c) => { setAdding(false); router.push(`/dashboard/sales/customers/${c.id}`); }} />
    </PageShell>
  );
}
