"use client";

/**
 * Entering items on one invoice, for someone who has Invoice entry.
 *
 * A bar stays at the bottom: Description, Part #, Qty, Price. Enter adds the
 * item and goes back to Description; the invoice saves itself a moment after
 * every change, and the bar says whether it is saved. Items that came from
 * stock are shown but cannot be changed here. Everything the page does goes
 * through entry_lines_save, which checks that this invoice was shared with
 * this person, that it is still a draft, and every value on every line.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock, Plus, X } from "lucide-react";
import EntryGuard from "@/components/EntryGuard";
import PageShell from "@/components/page-shell";
import { Panel, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Input } from "@/components/console/controls";
import { entryLinesSave, entryOrderGet, type EntryLine, type EntryOrder } from "@/lib/access";
import { centsToInput, fmtMoney, toCents, why } from "@/lib/sales";
import ImportLinesButton from "@/components/sales/ImportLines";
import type { ImportLine } from "@/lib/importLines";

type Row = { key: string; description: string; part: string; qty: number; qtyText?: string; cents: number | null; priceText: string };

let keySeq = 0;
const nextKey = () => `e${++keySeq}`;

export default function EntrySheetPage() {
  return (
    <EntryGuard>
      <EntrySheet />
    </EntryGuard>
  );
}

function EntrySheet() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<EntryOrder | null>(null);
  const [locked, setLocked] = useState<EntryLine[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [quick, setQuick] = useState({ desc: "", part: "", qty: "1", price: "" });
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const descRef = useRef<HTMLInputElement>(null);
  const changeSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await entryOrderGet(id);
      setOrder(r.order);
      setLocked(r.lines.filter((l) => l.locked));
      setRows(r.lines.filter((l) => !l.locked).map((l) => ({
        key: nextKey(), description: l.description, part: l.part_number || "", qty: l.quantity,
        cents: l.unit_price_cents, priceText: centsToInput(l.unit_price_cents),
      })));
    } catch (e) {
      setError(why(e));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const editable = order?.status === "draft";

  const save = async () => {
    if (!order || !editable) return;
    savingRef.current = true;
    setSaving(true);
    const seq = changeSeq.current;
    try {
      await entryLinesSave(order.id, rows.map((r) => ({
        description: r.description.trim() || "Item", part_number: r.part.trim() || null,
        quantity: Math.max(1, Math.round(r.qty) || 1), unit_price_cents: r.cents,
      })));
      setSaveError("");
      setSavedAt(new Date());
      /* Totals and the locked lines come back from the database; the rows on
         screen are left alone so nothing moves under the typing. */
      const fresh = await entryOrderGet(order.id);
      setOrder(fresh.order);
      setLocked(fresh.lines.filter((l) => l.locked));
      if (changeSeq.current === seq) setDirty(false);
    } catch (e) {
      setSaveError(why(e));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  useEffect(() => { saveRef.current = save; });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /* A moment after the last change. If a save is still running, wait for it
     (a second one at the same time could land out of order). */
  const touch = () => {
    changeSeq.current += 1;
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    const run = async () => {
      if (savingRef.current) { timer.current = setTimeout(run, 400); return; }
      await saveRef.current();
    };
    timer.current = setTimeout(run, 700);
  };

  /* Leaving with something unsaved: ask. */
  useEffect(() => {
    if (!dirty && !saving) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty, saving]);

  const edit = (key: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    touch();
  };

  const quickAdd = () => {
    const desc = quick.desc.trim();
    if (!desc) { descRef.current?.focus(); return; }
    const qty = Math.max(1, parseInt(quick.qty, 10) || 1);
    const cents = toCents(quick.price);
    setRows((prev) => [...prev, { key: nextKey(), description: desc.slice(0, 300), part: quick.part.trim().slice(0, 60), qty, cents, priceText: centsToInput(cents) }]);
    setLastAdded(`${desc} · ${qty} × ${cents == null ? "no price yet" : fmtMoney(cents)}`);
    setQuick({ desc: "", part: "", qty: "1", price: "" });
    touch();
    descRef.current?.focus();
  };
  const quickKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); quickAdd(); }
  };
  /* Lines from a spreadsheet go on the page like typed ones; the autosave below saves them. */
  const importLines = (list: ImportLine[]) => {
    setRows((prev) => [...prev, ...list.map((l) => ({ key: nextKey(), description: l.description, part: l.part, qty: l.qty, cents: l.cents, priceText: centsToInput(l.cents) }))]);
    setLastAdded(`${list.length} item${list.length === 1 ? "" : "s"} from a spreadsheet`);
    touch();
  };
  const priceEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const all = [...document.querySelectorAll<HTMLInputElement>('input[aria-label="Price"]')];
    const next = all[all.indexOf(e.currentTarget) + 1];
    if (next) { next.focus(); next.select(); } else descRef.current?.focus();
  };

  if (loading) {
    return (
      <PageShell title="Invoice entry" subtitle="Opening it.">
        <CrateSkeleton className="h-64 w-full" />
      </PageShell>
    );
  }
  if (!order) {
    return (
      <PageShell title="Invoice entry" subtitle="Not available.">
        <p className="max-w-lg text-sm text-muted-foreground">{error || "That invoice is not shared with you."}</p>
        <Link href="/dashboard/entry" className="mt-3 inline-block text-sm text-[var(--brand-2)] hover:underline">Back to your invoices</Link>
      </PageShell>
    );
  }

  const unitsTotal = rows.reduce((n, r) => n + r.qty, 0) + locked.reduce((n, l) => n + l.quantity, 0);
  const subtotal = rows.reduce((n, r) => n + r.qty * (r.cents ?? 0), 0) + locked.reduce((n, l) => n + Number(l.line_cents || 0), 0);
  const itemCount = rows.length + locked.length;
  const unpriced = rows.filter((r) => r.cents == null).length;

  return (
    <PageShell
      title={order.number}
      subtitle={[order.company, order.customer].filter(Boolean).join(" → ") || "Invoice"}
      actions={editable ? <ImportLinesButton onImport={importLines} /> : undefined}
    >
      {!editable ? (
        <p className="mb-4 rounded-md bg-amber-500/10 p-3 text-[13px] text-amber-800 dark:text-amber-200">
          This invoice is no longer a draft, so it cannot be changed here. Ask the owner if something needs fixing.
        </p>
      ) : null}
      {saveError ? (
        <p role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-destructive/10 p-3 text-[13px] text-destructive">
          <span>Your last change was not saved: {saveError}</span>
          <button type="button" onClick={() => saveRef.current()} className="font-semibold underline underline-offset-2">Try again</button>
        </p>
      ) : null}

      <Panel className="min-w-0 overflow-clip">
        <div className="hidden items-center gap-3 border-b border-border px-5 py-2.5 lg:flex">
          <ColHead className="min-w-0 flex-1">Item</ColHead>
          <ColHead className="w-36 shrink-0">Part #</ColHead>
          <ColHead className="w-20 shrink-0 text-right">Qty</ColHead>
          <ColHead className="w-28 shrink-0 text-right">Price</ColHead>
          <ColHead className="w-28 shrink-0 text-right">Line</ColHead>
          <span className="w-6 shrink-0" />
        </div>

        {locked.map((l) => (
          <div key={l.id} className="row-line flex flex-wrap items-center gap-3 px-5 py-3 text-sm lg:flex-nowrap">
            <div className="min-w-0 flex-1 basis-full lg:basis-auto">
              <p className="truncate font-medium">{l.description}</p>
              <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Lock className="h-3 w-3" /> Added by the owner, cannot be changed here</p>
            </div>
            <span className="mono w-36 shrink-0 truncate text-[12px] text-muted-foreground">{l.part_number || ""}</span>
            <span className="mono w-20 shrink-0 text-right">{l.quantity}</span>
            <span className="mono w-28 shrink-0 text-right">{fmtMoney(l.unit_price_cents)}</span>
            <span className="mono w-28 shrink-0 text-right">{fmtMoney(l.line_cents)}</span>
            <span className="w-6 shrink-0" />
          </div>
        ))}

        {rows.map((r, idx) => (
          <div key={r.key} className="row-line flex flex-wrap items-center gap-3 px-5 py-3 lg:flex-nowrap">
            <div className="min-w-0 flex-1 basis-full lg:basis-auto">
              {editable
                ? <Input value={r.description} onChange={(e) => edit(r.key, { description: e.target.value })} maxLength={300} aria-label="Description" />
                : <p className="truncate text-sm font-medium">{r.description}</p>}
              <p className="mono text-[12px] text-muted-foreground">#{locked.length + idx + 1}</p>
            </div>
            <div className="w-full sm:w-36 lg:shrink-0">
              {editable
                ? <Input value={r.part} onChange={(e) => edit(r.key, { part: e.target.value })} maxLength={60} aria-label="Part number" className="mono" />
                : <p className="mono truncate text-[12px] text-muted-foreground">{r.part}</p>}
            </div>
            <div className="w-20 shrink-0">
              {editable
                ? <Input type="number" min={1} value={r.qtyText ?? r.qty} aria-label="Quantity" className="mono text-right"
                    onChange={(e) => edit(r.key, { qtyText: e.target.value, qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    onBlur={() => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, qtyText: undefined } : x)))} />
                : <p className="mono text-right text-sm">{r.qty}</p>}
            </div>
            <div className="w-28 shrink-0">
              {editable
                ? <Input value={r.priceText} inputMode="decimal" aria-label="Price" placeholder="$ —"
                    onChange={(e) => edit(r.key, { priceText: e.target.value, cents: toCents(e.target.value) })}
                    onBlur={() => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, priceText: centsToInput(x.cents) } : x)))}
                    onKeyDown={priceEnter}
                    className={`mono text-right ${r.cents == null ? "border-amber-500 bg-amber-500/5" : ""}`} />
                : <p className="mono text-right text-sm">{fmtMoney(r.cents)}</p>}
            </div>
            <div className="w-28 shrink-0 text-right">
              {r.cents == null
                ? <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">needs a price</span>
                : <span className="mono text-sm">{fmtMoney(r.qty * r.cents)}</span>}
            </div>
            <div className="w-6 shrink-0">
              {editable ? (
                <button type="button" tabIndex={-1} aria-label={`Remove ${r.description}`}
                  onClick={() => { setRows((prev) => prev.filter((x) => x.key !== r.key)); touch(); }}
                  className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              ) : null}
            </div>
          </div>
        ))}

        {itemCount === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No items yet. Type the first one below.</p>
        ) : null}

        {editable ? (
          <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 p-4 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">Add another item</span>
              <span aria-live="polite">
                <span className="mono font-semibold text-foreground">{itemCount}</span> {itemCount === 1 ? "item" : "items"} ·{" "}
                <span className="mono font-semibold text-foreground">{unitsTotal}</span> units ·{" "}
                <span className="mono font-semibold text-foreground">{fmtMoney(subtotal)}</span> ·{" "}
                {saving ? "saving…" : saveError ? "not saved" : dirty ? "not saved yet" : savedAt ? `all saved at ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "all saved"}
                {unpriced ? <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">{unpriced} without a price</span> : null}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <Input ref={descRef} value={quick.desc} onChange={(e) => setQuick((q) => ({ ...q, desc: e.target.value }))} onKeyDown={quickKey}
                placeholder="Description" aria-label="New item description" maxLength={300} autoFocus className="min-w-0 flex-1 basis-full lg:basis-auto" />
              <Input value={quick.part} onChange={(e) => setQuick((q) => ({ ...q, part: e.target.value }))} onKeyDown={quickKey}
                placeholder="Part #" aria-label="New item part number" maxLength={60} className="mono w-full sm:w-36" />
              <Input value={quick.qty} onChange={(e) => setQuick((q) => ({ ...q, qty: e.target.value.replace(/[^\d]/g, "") }))} onKeyDown={quickKey}
                onFocus={(e) => e.currentTarget.select()} inputMode="numeric" placeholder="Qty" aria-label="New item quantity" className="mono w-20 text-right" />
              <Input value={quick.price} onChange={(e) => setQuick((q) => ({ ...q, price: e.target.value }))} onKeyDown={quickKey}
                inputMode="decimal" placeholder="$ price" aria-label="New item price" className="mono w-28 text-right" />
              <Action solid onClick={quickAdd} aria-label="Add this item"><Plus className="h-3.5 w-3.5" /> Add</Action>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {lastAdded ? <>Last added: <span className="text-foreground">{lastAdded}</span>. </> : null}
              Press Enter to add. It saves by itself. Tab moves between the boxes.
            </p>
          </div>
        ) : null}
      </Panel>
    </PageShell>
  );
}
