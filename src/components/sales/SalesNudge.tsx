"use client";

/* On the Overview, for people with Sales on: what is owed and what is late,
   one line, linking to the invoices. Nothing at all when nothing is owed. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { fmtMoney, todayIso } from "@/lib/sales";

export default function SalesNudge() {
  const { orgId, canSales } = useAuth();
  const [s, setS] = useState<{ owed: number; overdue: number; late: number } | null>(null);

  useEffect(() => {
    if (!orgId || !canSales) return;
    let stale = false;
    supabase.from("sales_invoices").select("total_cents, due_on").eq("org_id", orgId).eq("status", "issued").limit(10000)
      .then(({ data }) => {
        if (stale || !data) return;
        const today = todayIso();
        const late = data.filter((r) => r.due_on < today);
        setS({
          owed: data.reduce((n, r) => n + Number(r.total_cents || 0), 0),
          overdue: late.reduce((n, r) => n + Number(r.total_cents || 0), 0),
          late: late.length,
        });
      });
    return () => { stale = true; };
  }, [orgId, canSales]);

  if (!canSales || !s || s.owed <= 0) return null;
  return (
    <Link href="/dashboard/invoices/sales"
      className={`reveal panel flex flex-wrap items-center gap-x-6 gap-y-1 p-4 transition-colors hover:border-[var(--brand-2)] ${s.late ? "panel-live" : ""}`}>
      <span className="text-[12px] text-muted-foreground">Owed to you</span>
      <span className="font-display text-lg font-bold tabular-nums">{fmtMoney(s.owed)}</span>
      {s.late ? (
        <span className="rounded-full bg-destructive/12 px-2.5 py-0.5 text-[12px] font-semibold text-destructive">
          {s.late} invoice{s.late === 1 ? "" : "s"} overdue · {fmtMoney(s.overdue)}
        </span>
      ) : <span className="text-[12px] text-muted-foreground">Nothing overdue</span>}
      <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-2)]">Sales invoices <ArrowUpRight className="h-3 w-3" /></span>
    </Link>
  );
}
