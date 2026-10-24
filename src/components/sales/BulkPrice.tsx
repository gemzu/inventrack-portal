"use client";

/**
 * "Set sale price" on the Inventory bulk bar. One price for every selected
 * line, or a percentage up or down from each line's current sale price.
 * Every new price is shown beside the old one before anything is saved, and
 * the server applies exactly those (inventory_set_sale_prices), all at once.
 * Sold lines are left out. Cost price is never shown or changed.
 */

import { useMemo, useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Action, Chip, Field, Input, Modal, Segmented } from "@/components/console/controls";
import { fmtMoney, toCents, why } from "@/lib/sales";

export interface PriceItem { id: string; name: string; status: string; sellingPrice?: number | null }
type Mode = "set" | "percent";
type Round = "cent" | "dollar" | "99";

const centsOf = (dollars: number | null | undefined) =>
  dollars == null || !(Number(dollars) > 0) ? null : Math.round(Number(dollars) * 100);

function rounded(c: number, r: Round) {
  if (r === "dollar") return Math.max(0, Math.round(c / 100) * 100);
  if (r === "99") return Math.max(99, Math.round(c / 100) * 100 - 1);
  return Math.max(0, Math.round(c));
}

export function BulkPriceButton({ items, onSaved }: { items: PriceItem[]; onSaved: (prices: Record<string, number>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Action onClick={() => setOpen(true)}><Tag className="h-3.5 w-3.5" /> Set sale price</Action>
      {open ? <BulkPriceModal items={items} onClose={() => setOpen(false)} onSaved={(p) => { onSaved(p); setOpen(false); }} /> : null}
    </>
  );
}

function BulkPriceModal({ items, onClose, onSaved }: { items: PriceItem[]; onClose: () => void; onSaved: (prices: Record<string, number>) => void }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("set");
  const [priceText, setPriceText] = useState("");
  const [pctText, setPctText] = useState("");
  const [round, setRound] = useState<Round>("cent");
  const [saving, setSaving] = useState(false);

  const lines = items.filter((i) => i.status !== "sold");
  const soldLeftOut = items.length - lines.length;
  const pct = Number(pctText.replace(/[^\d.\-]/g, ""));
  const pctOk = pctText.trim() !== "" && Number.isFinite(pct) && pct > -100 && pct <= 1000;
  const setCents = toCents(priceText);

  const plan = useMemo(() => lines.map((i) => {
    const now = centsOf(i.sellingPrice);
    let next: number | null = null;
    if (mode === "set") next = setCents == null ? null : rounded(setCents, "cent");
    else if (pctOk && now != null) next = rounded(now * (1 + pct / 100), round);
    return { ...i, now, next, skipped: mode === "percent" && now == null };
  }), [lines, mode, setCents, pct, pctOk, round]);

  const changes = plan.filter((p) => p.next != null && p.next !== p.now);
  const skipped = plan.filter((p) => p.skipped).length;
  const unpriced = plan.filter((p) => p.now == null).length;
  const ready = changes.length > 0 && (mode === "set" ? setCents != null : pctOk);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("inventory_set_sale_prices", {
      p_items: changes.map((c) => ({ id: c.id, cents: c.next })),
    });
    setSaving(false);
    if (error) { toast(`Prices not saved: ${why(error)}`, "error"); return; }
    toast(`Sale price set on ${data} line${data === 1 ? "" : "s"}`, "success");
    onSaved(Object.fromEntries(changes.map((c) => [c.id, (c.next as number) / 100])));
  };

  return (
    <Modal open onClose={onClose} wide title="Set sale price"
      subtitle={`${lines.length} line${lines.length === 1 ? "" : "s"}${unpriced ? ` · ${unpriced} without a price now` : ""}${soldLeftOut ? ` · ${soldLeftOut} sold, left out` : ""}`}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={setMode}
          options={[{ value: "set", label: "One price for all" }, { value: "percent", label: "Change by %" }]} />

        {mode === "set" ? (
          <Field label="New sale price (each)">
            <Input autoFocus inputMode="decimal" value={priceText} placeholder="$ 0.00" className="mono max-w-40"
              onChange={(e) => setPriceText(e.target.value)} onBlur={() => setCents != null && setPriceText((setCents / 100).toFixed(2))} />
          </Field>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Change by (%)" hint="10 raises by 10%, -5 lowers by 5%.">
              <Input autoFocus inputMode="decimal" value={pctText} placeholder="10" className="mono max-w-28"
                onChange={(e) => setPctText(e.target.value)} aria-invalid={pctText !== "" && !pctOk} />
            </Field>
            <div>
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">Round to</p>
              <div className="flex gap-2">
                <Chip on={round === "cent"} onClick={() => setRound("cent")}>Cent</Chip>
                <Chip on={round === "dollar"} onClick={() => setRound("dollar")}>Whole dollar</Chip>
                <Chip on={round === "99"} onClick={() => setRound("99")}>.99</Chip>
              </div>
            </div>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Now</th>
                <th className="px-3 py-2 text-right font-medium">New</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="max-w-0 truncate px-3 py-1.5">{p.name}</td>
                  <td className={`mono px-3 py-1.5 text-right tabular-nums ${p.now == null ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                    {p.now == null ? "no price" : fmtMoney(p.now)}
                  </td>
                  <td className="mono px-3 py-1.5 text-right font-semibold tabular-nums">
                    {p.skipped ? <span className="font-normal text-muted-foreground">skipped</span>
                      : p.next == null ? "—" : p.next === p.now ? <span className="font-normal text-muted-foreground">same</span> : fmtMoney(p.next)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[13px] text-muted-foreground" role="status">
          {ready ? `${changes.length} price${changes.length === 1 ? "" : "s"} will change.` : mode === "set" ? "Type the new price." : "Type the change in percent."}
          {skipped ? ` ${skipped} line${skipped === 1 ? " has" : "s have"} no price yet, so a percentage can't apply - set those with One price.` : ""}
          {" "}Nothing is saved until you press Save.
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Action onClick={onClose}>Cancel</Action>
        <Action solid onClick={save} disabled={!ready || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save {ready ? changes.length : ""} price{changes.length === 1 ? "" : "s"}
        </Action>
      </div>
    </Modal>
  );
}
