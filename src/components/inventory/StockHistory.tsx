"use client";

/* An item's stock history on the website, as the phone shows it: every change to the quantity, newest first, with
   what it was, who did it and what was left. Read from stock_movements (admins of the item's account). */

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

const REASON_WORD: Record<string, string> = {
  adjust: "Adjusted", count: "Counted", delete: "Deleted", receive: "Received", sold: "Sold",
  transfer: "Moved", undo_scan: "Scan undone", scan_blacklisted: "Blocked scan",
};

type Move = { id: string; delta: number; quantity_after: number | null; reason: string | null; actor_email: string | null; created_at: string };

export default function StockHistory({ itemId }: { itemId: string }) {
  const [rows, setRows] = useState<Move[] | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let stale = false;
    supabase.from("stock_movements").select("id, delta, quantity_after, reason, actor_email, created_at")
      .eq("inventory_id", itemId).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (!stale) setRows((data as Move[]) || []); });
    return () => { stale = true; };
  }, [itemId]);

  if (!rows || rows.length === 0) return null;
  const shown = more ? rows : rows.slice(0, 8);
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-muted-foreground">Stock history</p>
      <ul className="divide-y divide-border rounded-md border border-border">
        {shown.map((m) => {
          const up = m.delta > 0;
          const d = new Date(m.created_at);
          const when = `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
          const label = REASON_WORD[m.reason || ""] || (m.reason ? m.reason.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Adjusted");
          const who = m.actor_email ? m.actor_email.split("@")[0] : "";
          return (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${m.reason === "delete" ? "bg-destructive/10 text-destructive" : up ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{label} {up ? "+" : ""}{m.delta}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{when}{who ? ` · ${who}` : ""}</span>
              </span>
              {m.quantity_after != null ? <span className="mono shrink-0 text-[12px] tabular-nums text-muted-foreground">now {m.quantity_after}</span> : null}
            </li>
          );
        })}
      </ul>
      {rows.length > 8 && !more ? (
        <button type="button" onClick={() => setMore(true)} className="mt-2 text-[12px] font-medium text-[var(--brand-2)]">Show all {rows.length}</button>
      ) : null}
    </div>
  );
}
