"use client";

/**
 * Invoice entry - the invoices the owner has shared with you.
 *
 * With one invoice there is nothing to choose, so it opens straight away. The
 * list only appears when there are several (or none).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import EntryGuard from "@/components/EntryGuard";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { entryOrdersMine, type EntryOrderRow } from "@/lib/access";
import { fmtDate, fmtMoney } from "@/lib/sales";

export default function EntryHomePage() {
  return (
    <EntryGuard>
      <EntryHome />
    </EntryGuard>
  );
}

function EntryHome() {
  const router = useRouter();
  const [rows, setRows] = useState<EntryOrderRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    entryOrdersMine()
      .then((r) => {
        if (!live) return;
        if (r.length === 1) { router.replace(`/dashboard/entry/${r[0].order_id}`); return; }
        setRows(r);
      })
      .catch((e: Error) => { if (live) { setError(e.message); setRows([]); } });
    return () => { live = false; };
  }, [router]);

  return (
    <PageShell title="Invoice entry" subtitle="Add items to the invoices that were shared with you.">
      {rows === null ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing shared with you yet"
          description="When the owner shares an invoice with you it shows up here."
        />
      ) : (
        <Panel>
          <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
            <ColHead className="min-w-0 flex-1">Invoice</ColHead>
            <ColHead className="w-24 shrink-0 text-right">Items</ColHead>
            <ColHead className="w-32 shrink-0 text-right">Total</ColHead>
            <ColHead className="w-32 shrink-0">Until</ColHead>
          </div>
          {rows.map((r) => (
            <Link key={r.order_id} href={`/dashboard/entry/${r.order_id}`} className="row-line flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.number}{r.customer_name ? ` · ${r.customer_name}` : ""}</p>
                <p className="truncate text-[12px] text-muted-foreground">{r.company_name || "—"}{r.status !== "draft" ? " · locked" : ""}</p>
              </div>
              <span className="mono hidden w-24 shrink-0 text-right text-sm tabular-nums md:block">{r.line_count}</span>
              <span className="mono hidden w-32 shrink-0 text-right text-sm tabular-nums md:block">{fmtMoney(r.total_cents)}</span>
              <span className="hidden w-32 shrink-0 text-[12px] text-muted-foreground md:block">{r.expires_at ? fmtDate(r.expires_at) : "No end date"}</span>
            </Link>
          ))}
        </Panel>
      )}
    </PageShell>
  );
}
