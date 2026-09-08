"use client";

/**
 * Purchase orders.
 *
 * Was a stack of cards, each with a bold uppercase status capsule and three
 * buttons of three different weights crowded on the right. Rebuilt as a ledger:
 * supplier, what is on the order, its state, and the one action that state
 * allows. The creator is the console modal instead of a sheet that slid up from
 * the bottom with its own radius.
 *
 * Receiving still goes through ReceivePo, which counts each line in rather than
 * assuming the delivery arrived exactly as ordered.
 */

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, X, Trash2, ClipboardList } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Status from "@/components/Status";
import { useToast } from "@/components/Toast";
import ReceivePo from "@/components/dashboard/ReceivePo";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Modal } from "@/components/console/controls";

type Line = { barcode: string; modelId: string; name?: string; qty: number; cost?: number | null };
type PO = {
  id: string; supplier: string | null; reference: string | null; status: string;
  items: Line[]; facility_id: string | null; created_at: string;
};

export default function PurchaseOrdersPage() {
  const { orgId, user } = useAuth();
  const { toast } = useToast();

  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [receiving, setReceiving] = useState<PO | null>(null);

  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [lBarcode, setLBarcode] = useState("");
  const [lQty, setLQty] = useState("");
  const [lCost, setLCost] = useState("");

  const load = async () => {
    if (!orgId) { setLoading(false); return; }
    const { data } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setPos(((data as PO[]) || []).map((p) => ({ ...p, items: Array.isArray(p.items) ? p.items : [] })));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const draftUnits = useMemo(() => lines.reduce((s, l) => s + (l.qty || 0), 0), [lines]);

  const onOrder = useMemo(
    () => pos.filter((p) => p.status === "draft" || p.status === "ordered")
      .reduce((s, p) => s + p.items.reduce((n, l) => n + (l.qty || 1), 0), 0),
    [pos]
  );
  const openCount = useMemo(() => pos.filter((p) => p.status !== "received").length, [pos]);

  const addLine = () => {
    const bc = lBarcode.trim();
    if (!bc) return;
    setLines((p) => [
      ...p,
      {
        barcode: bc,
        modelId: bc,
        qty: Math.max(1, parseInt(lQty, 10) || 1),
        cost: lCost ? parseFloat(lCost) : null,
      },
    ]);
    setLBarcode(""); setLQty(""); setLCost("");
  };

  const createPo = async () => {
    if (!orgId || lines.length === 0) { toast("Add at least one line item", "error"); return; }
    const { error } = await supabase.from("purchase_orders").insert({
      org_id: orgId, supplier: supplier || null, reference: reference || null,
      items: lines, status: "draft", created_by: user?.id ?? null, created_by_email: user?.email ?? null,
    });
    if (error) { toast("Could not create PO", "error"); return; }
    toast("Purchase order created", "success");
    setShowCreate(false); setSupplier(""); setReference(""); setLines([]);
    load();
  };

  const markOrdered = async (po: PO) => {
    await supabase
      .from("purchase_orders")
      .update({ status: "ordered", ordered_at: new Date().toISOString() })
      .eq("id", po.id);
    load();
  };

  const removePo = async (po: PO) => {
    if (!confirm("Delete this purchase order?")) return;
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    load();
  };

  return (
    <AdminGuard>
      <PageShell
        title="Purchase orders"
        eyebrow="Console"
        subtitle="Everything coming in, and how far along it is."
        actions={
          <Action solid onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New order
          </Action>
        }
      >
        {loading ? (
          <ListSkeleton rows={5} />
        ) : (
          <div className="space-y-8">
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label="Orders" value={pos.length} />
              <Figure label="Still open" value={openCount} tone={openCount ? "brand" : undefined} />
              <Figure label="Units expected" value={onOrder} />
            </div>

            {pos.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nothing on order"
                description="Create a PO, mark it ordered, then receive it into stock."
              />
            ) : (
              <Panel className="reveal">
                <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                  <ColHead className="min-w-0 flex-1">Supplier</ColHead>
                  <ColHead className="w-24 shrink-0 text-right">Units</ColHead>
                  <ColHead className="w-32 shrink-0">State</ColHead>
                  <span className="w-40 shrink-0" />
                </div>

                {pos.map((po) => {
                  const units = po.items.reduce((s, l) => s + (l.qty || 1), 0);
                  return (
                    <div key={po.id} className="row-line flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {po.supplier || "Unnamed supplier"}
                        </p>
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {po.reference ? `${po.reference} · ` : ""}
                          {po.items.length} {po.items.length === 1 ? "line" : "lines"}
                        </p>
                      </div>

                      <span className="mono hidden w-24 shrink-0 text-right text-sm font-semibold tabular-nums md:block">
                        {units}
                      </span>
                      <div className="hidden w-32 shrink-0 md:block">
                        <Status status={po.status} />
                      </div>

                      <div className="flex w-40 shrink-0 items-center justify-end gap-4">
                        {po.status === "draft" && (
                          <button
                            onClick={() => markOrdered(po)}
                            className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                          >
                            Send
                          </button>
                        )}
                        {(po.status === "draft" || po.status === "ordered") && (
                          <button
                            onClick={() => setReceiving(po)}
                            className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--brand-2)] transition-colors duration-300 hover:text-foreground"
                          >
                            Receive
                          </button>
                        )}
                        {po.status !== "received" && (
                          <button
                            onClick={() => removePo(po)}
                            aria-label="Delete this purchase order"
                            className="text-muted-foreground transition-colors duration-300 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Panel>
            )}
          </div>
        )}

        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="New purchase order"
          subtitle={`${draftUnits} units on this draft`}
        >
          <div className="space-y-5">
            <Field label="Supplier">
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Acme Distributors"
              />
            </Field>
            <Field label="Reference" hint="Their PO number, if there is one.">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
              />
            </Field>

            <Field label="Lines">
              {lines.length > 0 && (
                <Panel className="mb-3">
                  {lines.map((l, i) => (
                    <div key={i} className="row-line flex items-center gap-3 px-4 py-2.5">
                      <span className="mono min-w-0 flex-1 truncate text-sm">{l.barcode}</span>
                      <span className="mono shrink-0 text-sm font-semibold tabular-nums">
                        {l.qty}
                      </span>
                      {l.cost != null && (
                        <span className="mono shrink-0 text-[11px] text-muted-foreground">
                          ${l.cost}
                        </span>
                      )}
                      <button
                        onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                        aria-label="Remove line"
                        className="shrink-0 text-muted-foreground transition-colors duration-300 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </Panel>
              )}
              <div className="flex gap-2">
                <Input
                  value={lBarcode}
                  onChange={(e) => setLBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLine()}
                  placeholder="Barcode or model"
                  aria-label="Barcode or model"
                  className="flex-1"
                />
                <Input
                  value={lQty}
                  onChange={(e) => setLQty(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Qty"
                  aria-label="Quantity"
                  className="w-20 text-center"
                />
                <Input
                  value={lCost}
                  onChange={(e) => setLCost(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Cost"
                  aria-label="Unit cost"
                  className="w-24 text-center"
                />
                <Action onClick={addLine} aria-label="Add line" className="px-3">
                  <Plus className="h-3.5 w-3.5" />
                </Action>
              </div>
            </Field>

            <Action solid onClick={createPo} className="w-full">
              Create purchase order
            </Action>
          </div>
        </Modal>

        {receiving && (
          <ReceivePo
            po={receiving}
            orgId={orgId as string}
            onClose={() => setReceiving(null)}
            onDone={() => { setReceiving(null); load(); }}
          />
        )}
      </PageShell>
    </AdminGuard>
  );
}
