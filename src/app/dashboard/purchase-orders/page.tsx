"use client";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, X, Trash2, Send, Download, ClipboardList } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Line = { barcode: string; modelId: string; name?: string; qty: number; cost?: number | null };
type PO = {
  id: string; supplier: string | null; reference: string | null; status: string;
  items: Line[]; facility_id: string | null; created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-primary/15 text-primary",
  received: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function PurchaseOrdersPage() {
  const { orgId, user } = useAuth();
  const { toast } = useToast();

  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [lBarcode, setLBarcode] = useState("");
  const [lQty, setLQty] = useState("");
  const [lCost, setLCost] = useState("");

  const load = async () => {
    if (!orgId) { setLoading(false); return; }
    const { data } = await supabase.from("purchase_orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    setPos(((data as PO[]) || []).map((p) => ({ ...p, items: Array.isArray(p.items) ? p.items : [] })));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const draftUnits = useMemo(() => lines.reduce((s, l) => s + (l.qty || 0), 0), [lines]);

  const addLine = () => {
    const bc = lBarcode.trim();
    if (!bc) return;
    setLines((p) => [...p, { barcode: bc, modelId: bc, qty: Math.max(1, parseInt(lQty, 10) || 1), cost: lCost ? parseFloat(lCost) : null }]);
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
    await supabase.from("purchase_orders").update({ status: "ordered", ordered_at: new Date().toISOString() }).eq("id", po.id);
    load();
  };

  const removePo = async (po: PO) => {
    if (!confirm("Delete this purchase order?")) return;
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    load();
  };

  const receivePo = async (po: PO) => {
    if (!orgId) return;
    setBusy(po.id);
    try {
      let restocked = 0, added = 0;
      for (const l of po.items) {
        const code = (l.barcode || l.modelId || "").trim();
        const qty = Math.max(1, l.qty || 1);
        if (!code) continue;
        const { data: found } = await supabase.from("inventory").select("id,quantity").eq("org_id", orgId).eq("barcode", code).limit(1);
        if (found && found.length > 0) {
          const row = found[0] as { id: string; quantity: number };
          await supabase.from("inventory").update({ quantity: (row.quantity || 0) + qty }).eq("id", row.id);
          restocked++;
        } else {
          await supabase.from("inventory").insert({
            org_id: orgId, barcode: code, model_id: l.modelId || code, display_name: l.name || null,
            quantity: qty, cost_price: l.cost ?? null, status: "available", facility_id: po.facility_id ?? null,
          });
          added++;
        }
      }
      await supabase.from("purchase_orders").update({ status: "received", received_at: new Date().toISOString() }).eq("id", po.id);
      toast(`Received — ${restocked} restocked, ${added} new`, "success");
      load();
    } catch {
      toast("Could not receive PO", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminGuard><PageShell
      title="Purchase Orders"
      subtitle={`${pos.length} order${pos.length !== 1 ? "s" : ""}`}
      actions={<Button variant="brand" onClick={() => setShowCreate(true)} className="h-10 px-4"><Plus className="w-4 h-4" /> New PO</Button>}
    >
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
      ) : pos.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No purchase orders" description="Create a PO, mark it ordered, then receive it into stock." />
      ) : (
        <div className="space-y-3">
          {pos.map((po) => {
            const units = po.items.reduce((s, l) => s + (l.qty || 1), 0);
            return (
              <Card key={po.id}><CardContent className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{po.supplier || "Unnamed supplier"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {po.reference ? `${po.reference} · ` : ""}{po.items.length} line(s) · {units} unit(s)
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[po.status] || STATUS_STYLE.draft}`}>
                  {po.status.toUpperCase()}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {po.status === "draft" && (
                    <Button variant="outline" className="h-9 px-3" onClick={() => markOrdered(po)}><Send className="w-4 h-4" /> Ordered</Button>
                  )}
                  {(po.status === "draft" || po.status === "ordered") && (
                    <Button variant="brand" className="h-9 px-3" disabled={busy === po.id} onClick={() => receivePo(po)}>
                      <Download className="w-4 h-4" /> {busy === po.id ? "Receiving…" : "Receive"}
                    </Button>
                  )}
                  {po.status !== "received" && (
                    <button onClick={() => removePo(po)} className="p-2 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">New Purchase Order</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Supplier</label>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Acme Distributors"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-input border-border outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Reference / PO #</label>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-input border-border outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-muted-foreground">Line items ({draftUnits} units)</label>
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 mb-2">
                    <span className="flex-1 text-sm font-medium truncate">{l.barcode}</span>
                    <span className="text-sm font-bold text-primary">×{l.qty}</span>
                    {l.cost != null && <span className="text-xs text-muted-foreground">${l.cost}</span>}
                    <button onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={lBarcode} onChange={(e) => setLBarcode(e.target.value)} placeholder="Barcode / model"
                    className="flex-1 px-3 py-2 rounded-xl border text-sm bg-input border-border outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={lQty} onChange={(e) => setLQty(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Qty"
                    className="w-16 px-2 py-2 rounded-xl border text-sm text-center bg-input border-border outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={lCost} onChange={(e) => setLCost(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Cost"
                    className="w-20 px-2 py-2 rounded-xl border text-sm text-center bg-input border-border outline-none focus:ring-2 focus:ring-primary/30" />
                  <Button variant="outline" className="h-auto px-3" onClick={addLine}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              <Button variant="brand" className="w-full h-11" onClick={createPo}>Create purchase order</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell></AdminGuard>
  );
}
