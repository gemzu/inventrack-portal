"use client";

/**
 * Receiving against a purchase order.
 *
 * The portal already had a Receive button, but it was blind: it looped the PO
 * lines and added the ordered quantity, so a delivery that arrived short or
 * over was recorded as if it had arrived exactly. That is the one thing
 * receiving exists to catch.
 *
 * This counts each line in. Ordered quantity is only the default; what you
 * type is what goes into stock, and the difference is shown as you go. The
 * counted figures are written back onto the PO lines so the record says what
 * actually turned up, and a PO with any shortfall is left partially received
 * rather than closed.
 */

import { useMemo, useState } from "react";
import { Loader2, PackageCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

export type Line = {
  barcode: string;
  modelId: string;
  name?: string;
  qty: number;
  cost?: number | null;
  received?: number;
};

export type PO = {
  id: string;
  supplier: string | null;
  reference: string | null;
  status: string;
  items: Line[];
  facility_id: string | null;
  created_at: string;
};

export default function ReceivePo({
  po,
  orgId,
  onClose,
  onDone,
}: {
  po: PO;
  orgId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  /* Ordered quantity is the default, not the answer. */
  const [counts, setCounts] = useState<number[]>(() =>
    po.items.map((l) => Math.max(0, l.received ?? l.qty ?? 0))
  );

  const summary = useMemo(() => {
    let short = 0, over = 0, exact = 0, units = 0;
    po.items.forEach((l, i) => {
      const got = counts[i] ?? 0;
      units += got;
      if (got < l.qty) short++;
      else if (got > l.qty) over++;
      else exact++;
    });
    return { short, over, exact, units, lines: po.items.length };
  }, [po.items, counts]);

  const setCount = (i: number, raw: string) => {
    const n = Math.max(0, Number(raw.replace(/[^0-9]/g, "")) || 0);
    setCounts((c) => c.map((v, idx) => (idx === i ? n : v)));
  };

  const apply = async () => {
    setBusy(true);
    try {
      let restocked = 0, added = 0, skipped = 0;

      for (let i = 0; i < po.items.length; i++) {
        const line = po.items[i];
        const got = counts[i] ?? 0;
        const code = (line.barcode || line.modelId || "").trim();
        if (!code || got <= 0) { skipped++; continue; }

        const { data: found } = await supabase
          .from("inventory")
          .select("id,quantity")
          .eq("org_id", orgId)
          .eq("barcode", code)
          .limit(1);

        if (found && found.length > 0) {
          const row = found[0] as { id: string; quantity: number };
          await supabase
            .from("inventory")
            .update({ quantity: (row.quantity || 0) + got })
            .eq("id", row.id);
          restocked++;
        } else {
          await supabase.from("inventory").insert({
            org_id: orgId,
            barcode: code,
            model_id: line.modelId || code,
            display_name: line.name || null,
            quantity: got,
            cost_price: line.cost ?? null,
            status: "available",
            facility_id: po.facility_id ?? null,
          });
          added++;
        }
      }

      /* Keep what actually arrived on the record, and only close the PO when
         every line was met. A short delivery stays open. */
      const items = po.items.map((l, i) => ({ ...l, received: counts[i] ?? 0 }));
      const complete = items.every((l) => (l.received ?? 0) >= l.qty);

      await supabase
        .from("purchase_orders")
        .update({
          items,
          status: complete ? "received" : "partial",
          received_at: new Date().toISOString(),
        })
        .eq("id", po.id);

      toast(
        `${summary.units} units in. ${restocked} restocked, ${added} new${skipped ? `, ${skipped} skipped` : ""}.`,
        "success"
      );
      onDone();
    } catch {
      toast("Could not receive this delivery", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Receive delivery"
        className="animate-in-scale relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border bg-card shadow-glow"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Receive delivery</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {po.supplier || "No supplier"}
              {po.reference ? ` · ${po.reference}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[1fr_5rem_5rem_5rem] gap-3 border-b border-border px-6 py-2.5 text-xs font-semibold text-muted-foreground">
            <span>Item</span>
            <span className="text-right">Ordered</span>
            <span className="text-right">Arrived</span>
            <span className="text-right">Diff</span>
          </div>

          {po.items.map((l, i) => {
            const got = counts[i] ?? 0;
            const diff = got - l.qty;
            return (
              <div
                key={`${l.barcode}-${i}`}
                className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center gap-3 border-b border-border/70 px-6 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name || l.modelId || l.barcode}</p>
                  <p className="mono truncate text-xs text-muted-foreground">{l.barcode}</p>
                </div>
                <span className="mono text-right text-sm text-muted-foreground">{l.qty}</span>
                <input
                  inputMode="numeric"
                  value={got}
                  onChange={(e) => setCount(i, e.target.value)}
                  aria-label={`Quantity arrived for ${l.name || l.barcode}`}
                  className="mono w-full rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm outline-none transition-[border-color,box-shadow] duration-200"
                />
                <span
                  className={`mono text-right text-sm font-semibold ${
                    diff === 0 ? "text-muted-foreground" : diff < 0 ? "text-warning" : "text-primary"
                  }`}
                >
                  {diff === 0 ? "0" : diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
            );
          })}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {summary.units} units over {summary.lines} lines
            {summary.short > 0 ? ` · ${summary.short} short` : ""}
            {summary.over > 0 ? ` · ${summary.over} over` : ""}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Add to stock
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
