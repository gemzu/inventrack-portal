"use client";
import AdminGuard from "@/components/AdminGuard";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getBoxById,
  getItemsInBox,
  getBoxStats,
  deleteBox,
  updateBox,
  moveItemsToBox,
  deleteInventoryItem,
  getInventoryPaginated,
  type Box,
  type BoxStats,
} from "@/lib/dataService";
import { ArrowLeft, Trash2, Edit2, Plus, Layers, X, Package, PackageMinus } from "lucide-react";
import PageShell from "@/components/page-shell";
import GlassCard from "@/components/glass-card";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Item {
  id: string;
  modelId?: string;
  barcode?: string;
  displayName?: string;
  brand?: string;
  quantity?: number;
  status?: string;
  createdAt?: string;
}

export default function BoxDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [box, setBox] = useState<Box | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<BoxStats>({ total: 0, available: 0, reserved: 0, sold: 0 });
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Box>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addCandidates, setAddCandidates] = useState<Item[]>([]);
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const id = params?.id as string;

  const toggleSelect = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [b, itemList, s] = await Promise.all([
        getBoxById(id),
        getItemsInBox(id),
        getBoxStats(id),
      ]);
      setBox(b);
      setItems(itemList as unknown as Item[]);
      setStats(s);
    } catch (e) {
      toast((e as Error).message || "Failed to load box", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (itemId: string) => {
    try {
      await moveItemsToBox([itemId], null);
      toast("Item removed from box", "success");
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to remove", "error");
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this item permanently? This cannot be undone.")) return;
    try {
      await deleteInventoryItem(itemId);
      toast("Item deleted", "success");
      setSelected((p) => { const n = new Set(p); n.delete(itemId); return n; });
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to delete", "error");
    }
  };

  const bulkRemove = async () => {
    if (selected.size === 0) return;
    try {
      await moveItemsToBox(Array.from(selected), null);
      toast(`Removed ${selected.size} item(s) from box`, "success");
      setSelected(new Set());
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to remove", "error");
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s) permanently? This cannot be undone.`)) return;
    try {
      await Promise.all(Array.from(selected).map((iid) => deleteInventoryItem(iid)));
      toast(`Deleted ${selected.size} item(s)`, "success");
      setSelected(new Set());
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to delete", "error");
    }
  };

  const handleDelete = async () => {
    if (!box) return;
    try {
      await deleteBox(box.id);
      toast("Box deleted", "success");
      router.push("/dashboard/boxes");
    } catch (e) {
      toast((e as Error).message || "Failed to delete", "error");
    }
  };

  const openEdit = () => {
    if (!box) return;
    setEditForm({ ...box });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!box) return;
    try {
      await updateBox(box.id, editForm);
      toast("Box updated", "success");
      setEditOpen(false);
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to update", "error");
    }
  };

  const openAddSheet = async () => {
    if (!orgId) return;
    setAddSelected(new Set());
    setAddSheetOpen(true);
    setAddLoading(true);
    try {
      const { items: looseItems } = await getInventoryPaginated(orgId, { loose: true }, 0, 200);
      setAddCandidates(looseItems as unknown as Item[]);
    } catch (e) {
      toast((e as Error).message || "Failed to load items", "error");
    } finally {
      setAddLoading(false);
    }
  };

  const toggleAddSelect = (itemId: string) => {
    setAddSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const confirmAdd = async () => {
    if (!box || addSelected.size === 0) return;
    try {
      await moveItemsToBox(Array.from(addSelected), box.id);
      toast(`Added ${addSelected.size} item(s)`, "success");
      setAddSheetOpen(false);
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to add", "error");
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <PageShell>
          <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
        </PageShell>
      </AdminGuard>
    );
  }

  if (!box) {
    return (
      <AdminGuard>
        <PageShell title="Box not found">
          <Card><CardContent className="p-0">
            <EmptyState icon={Layers} title="Box not found" description="This box may have been deleted." />
          </CardContent></Card>
        </PageShell>
      </AdminGuard>
    );
  }

  const capacityPct = box.capacity && box.capacity > 0 ? Math.min(100, Math.round((stats.total / box.capacity) * 100)) : null;
  const canDelete = stats.total === 0;

  return (
    <AdminGuard>
      <PageShell
        breadcrumb={
          <Link href="/dashboard/boxes" className="inline-flex items-center gap-1 text-sm hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Boxes
          </Link>
        }
        actions={
          <>
            <Button variant="outline" onClick={openEdit}>
              <Edit2 /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Delete
            </Button>
            <Button onClick={openAddSheet}>
              <Plus /> Add Items
            </Button>
          </>
        }
      >
        <GlassCard style={{ borderColor: (box.color || "#6366f1") + "66" }}>
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: (box.color || "#6366f1") + "33", color: box.color || "#6366f1" }}
            >
              <Layers className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-mono text-xl font-bold">{box.code}</h2>
                {box.category && <Badge variant="secondary">{box.category}</Badge>}
              </div>
              {box.label && <div className="text-muted-foreground mt-1">{box.label}</div>}
              {box.description && <p className="text-sm mt-2">{box.description}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Stat label="Total" value={stats.total} />
                <Stat label="Available" value={stats.available} tone="text-emerald-500" />
                <Stat label="Reserved" value={stats.reserved} tone="text-amber-500" />
                <Stat label="Sold" value={stats.sold} tone="text-blue-500" />
              </div>
              {capacityPct != null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Capacity</span>
                    <span>{stats.total} / {box.capacity} ({capacityPct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${capacityPct}%`,
                        backgroundColor: box.color || "#6366f1",
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="mt-4 text-xs text-muted-foreground space-y-0.5">
                {box.location && <div>Location: {box.location}</div>}
                {box.weightLimit != null && <div>Weight limit: {box.weightLimit} kg</div>}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Bulk-action bar (appears when items are selected) */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/25 sticky top-2 z-10 backdrop-blur-xl">
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={bulkRemove}><PackageMinus className="w-4 h-4" /> Remove from box</Button>
              <Button variant="destructive" size="sm" onClick={bulkDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        <Card className="overflow-hidden"><CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState icon={Package} title="Box is empty" description="Use the Add Items button to pull loose inventory into this box." />
          ) : (
            <>
              {/* Select-all header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
                  className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                  title="Select all"
                />
                <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
              {items.map((it) => {
                const sel = selected.has(it.id);
                return (
                  <div key={it.id} className={`group flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 transition-colors ${sel ? "bg-primary/[0.07]" : "hover:bg-primary/[0.04]"}`}>
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleSelect(it.id)}
                      className="w-4 h-4 shrink-0 accent-[var(--primary)] cursor-pointer"
                    />
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{it.modelId || it.displayName || "Item"}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {it.barcode || "-"}{it.brand ? ` · ${it.brand}` : ""}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0 hidden sm:block">×{it.quantity ?? "-"}</div>
                    <Badge variant="outline" className="shrink-0 hidden sm:inline-flex capitalize">{it.status || "-"}</Badge>
                    <button onClick={() => handleRemove(it.id)} title="Remove from box (keeps the item)" className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:bg-amber-500 hover:text-white transition-colors">
                      <PackageMinus className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteItem(it.id)} title="Delete item permanently" className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:bg-destructive hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </CardContent></Card>
      </PageShell>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit box</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Code</label>
                <Input value={editForm.code || ""} onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Label</label>
                <Input value={editForm.label || ""} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Description</label>
              <Input value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Capacity</label>
                <Input type="number" value={editForm.capacity ?? ""} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value ? parseInt(e.target.value, 10) : null })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Weight limit</label>
                <Input type="number" value={editForm.weightLimit ?? ""} onChange={(e) => setEditForm({ ...editForm, weightLimit: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Location</label>
              <Input value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete box?</DialogTitle>
            <DialogDescription>
              {canDelete
                ? "This cannot be undone."
                : `This box still contains ${stats.total} item(s). Remove them first before deleting.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add items sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>Add loose items to {box.code}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {addLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : addCandidates.length === 0 ? (
              <EmptyState icon={Package} title="No loose items" description="Every inventory item is already in a box." />
            ) : (
              <div className="space-y-1">
                {addCandidates.map((it) => {
                  const checked = addSelected.has(it.id);
                  return (
                    <label key={it.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAddSelect(it.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{it.modelId || it.displayName || "-"}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{it.barcode}</div>
                      </div>
                      <Badge variant="outline">{it.status || "-"}</Badge>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{addSelected.size} selected</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddSheetOpen(false)}>Cancel</Button>
              <Button onClick={confirmAdd} disabled={addSelected.size === 0}>
                Add {addSelected.size > 0 ? addSelected.size : ""}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AdminGuard>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${tone || ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

