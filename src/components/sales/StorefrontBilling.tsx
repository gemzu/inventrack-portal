"use client";

/**
 * In a storefront order's panel, for people with Sales on: turn it into a
 * sales order (sales_order_from_storefront), or open the one it already has.
 * The storefront order keeps its units; the sales order is for billing.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Action, Select } from "@/components/console/controls";
import { STATUS_LABEL, STATUS_TONE, why, type BillingCompany, type SalesStatus } from "@/lib/sales";

export default function StorefrontBilling({ orderId, status }: { orderId: string; status: string }) {
  const { orgId, canSales } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [billed, setBilled] = useState<{ id: string; number: string; status: SalesStatus }[] | null>(null);
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canSales || !orgId) return;
    let stale = false;
    Promise.all([
      supabase.from("sales_orders").select("id, number, status").eq("storefront_order_id", orderId).order("created_at", { ascending: false }),
      supabase.from("billing_companies").select("*").eq("org_id", orgId).eq("archived", false).order("name"),
    ]).then(([o, b]) => {
      if (stale) return;
      setBilled((o.data || []) as typeof billed);
      const list = (b.data || []) as BillingCompany[];
      setCompanies(list);
      setCompany((prev) => prev || list[0]?.id || "");
    });
    return () => { stale = true; };
  }, [canSales, orgId, orderId]);

  if (!canSales || billed == null) return null;
  const live = billed.find((b) => b.status !== "void");
  const cancelled = /cancel|reject/i.test(status);

  const make = async () => {
    if (!company) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("sales_order_from_storefront", { p_order: orderId, p_company: company });
    if (error || !data) { toast(`Not made: ${why(error)}`, "error"); setBusy(false); return; }
    toast("Sales order started from this storefront order", "success");
    router.push(`/dashboard/orders/sales/${data}`);
  };

  return (
    <div className="space-y-3 border-t border-border pt-5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Billing</p>
      {live ? (
        <Link href={`/dashboard/orders/sales/${live.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 hover:border-[var(--brand-2)]">
          <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" />
            <span className="mono font-semibold">{live.number}</span></span>
          <span className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[live.status]}`}>{STATUS_LABEL[live.status]}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </Link>
      ) : cancelled ? (
        <p className="text-[13px] text-muted-foreground">Cancelled orders are not billed.</p>
      ) : companies.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Add a billing company first (<Link href="/dashboard/sales/companies" className="text-[var(--brand-2)] hover:underline">Billing companies</Link>).
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            {companies.length > 1 ? (
              <Select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Billed by">
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : null}
            <Action solid onClick={make} disabled={busy || !company} className={companies.length > 1 ? "" : "w-full justify-center"}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Make sales order
            </Action>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Copies the lines and storefront prices into a draft, billed to this buyer&apos;s customer (made if there isn&apos;t one).
            The units stay with this storefront order.
          </p>
        </>
      )}
    </div>
  );
}
