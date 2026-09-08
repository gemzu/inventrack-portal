"use client";
import { itemIdentity } from "@/lib/itemIdentity";
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
import { ArrowLeft, Trash2, Edit2, Plus, Package, PackageMinus } from "lucide-react";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Drawer, Field, Input, Modal } from "@/components/console/controls";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

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
        <PageShell title="Box" subtitle="Reading what is inside." eyebrow="Box">
          <ListSkeleton rows={6} />
        </PageShell>
      </AdminGuard>
    );
  }

  if (!box) {
    return (
      <AdminGuard>
        <PageShell title="Not found" eyebrow="Box">
          <EmptyState
            icon={Package}
            title="No such box"
            description="It may have been deleted since you last had this open."
          />
        </PageShell>
      </AdminGuard>
    );
  }

  const capacityPct = box.capacity && box.capacity > 0 ? Math.min(100, Math.round((stats.total / box.capacity) * 100)) : null;
  const canDelete = stats.total === 0;

  return (
    <AdminGuard>
      <PageShell
        title={box.code}
        eyebrow="Box"
        subtitle={box.description || box.label || undefined}
        breadcrumb={
          <Link
            href="/dashboard/boxes"
            className="inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All boxes
          </Link>
        }
        actions={
          <>
            <Action onClick={openEdit}>
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Action>
            <Action
              onClick={() => setDeleteOpen(true)}
              className="border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Action>
            <Action solid onClick={openAddSheet}>
              <Plus className="h-3.5 w-3.5" /> Add items
            </Action>
          </>
        }
      >
        <div className="space-y-8">
          {/* What is in it. The box's own colour is the lit edge on the
              capacity bar rather than a tile behind an icon. */}
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="In this box" value={stats.total} />
            <Figure label="Available" value={stats.available} />
            <Figure
              label="Reserved"
              value={stats.reserved}
              tone={stats.reserved ? "warning" : undefined}
            />
            <Figure label="Sold" value={stats.sold} />
          </div>

          {capacityPct != null && (
            <div className="reveal d1">
              <div className="mono flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>Capacity</span>
                <span className="tabular-nums">
                  {stats.total} of {box.capacity} · {capacityPct}%
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-border">
                <div
                  className="h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.30,1)]"
                  style={{
                    width: `${capacityPct}%`,
                    backgroundColor: box.color || "var(--brand-2)",
                  }}
                />
              </div>
            </div>
          )}

          {(box.location || box.weightLimit != null || box.category) && (
            <p className="mono reveal d2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {[
                box.category,
                box.location,
                box.weightLimit != null ? `${box.weightLimit} kg limit` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="panel panel-live sticky top-16 z-20 flex flex-wrap items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur-xl">
              <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--brand-2)]">
                {selected.size} selected
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-4">
                <button
                  onClick={bulkRemove}
                  className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Take out of box
                </button>
                <button
                  onClick={bulkDelete}
                  className="mono text-[11px] uppercase tracking-[0.16em] text-destructive transition-colors duration-300 hover:text-foreground"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Box is empty"
              description="Pull loose stock into it with Add items."
            />
          ) : (
            <Panel className="reveal">
              <div className="flex items-center gap-4 border-b border-border px-5 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())
                  }
                  aria-label="Select everything in this box"
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--brand-2)]"
                />
                <ColHead className="min-w-0 flex-1">
                  {items.length} {items.length === 1 ? "line" : "lines"}
                </ColHead>
                <ColHead className="w-16 shrink-0 text-right">Qty</ColHead>
                <ColHead className="w-28 shrink-0">State</ColHead>
                <span className="w-20 shrink-0" />
              </div>

              {items.map((it) => {
                const sel = selected.has(it.id);
                const id = itemIdentity(it);
                const extra = [id.subtitle, it.brand].filter(Boolean).join(" · ");
                return (
                  <div
                    key={it.id}
                    className={`row-line group flex items-center gap-4 px-5 py-3 ${
                      sel ? "bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleSelect(it.id)}
                      aria-label={`Select ${id.title}`}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--brand-2)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                        {id.title}
                      </p>
                      <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {extra || "Unnamed"}
                      </p>
                    </div>
                    <span className="mono hidden w-16 shrink-0 text-right text-sm font-semibold tabular-nums sm:block">
                      {it.quantity ?? "—"}
                    </span>
                    <div className="hidden w-28 shrink-0 sm:block">
                      <Status status={it.status} />
                    </div>
                    <div className="flex w-20 shrink-0 items-center justify-end gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <button
                        onClick={() => handleRemove(it.id)}
                        title="Take out of this box, keep the item"
                        aria-label="Take out of this box"
                        className="text-muted-foreground transition-colors duration-300 hover:text-warning"
                      >
                        <PackageMinus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(it.id)}
                        title="Delete this item for good"
                        aria-label="Delete this item"
                        className="text-muted-foreground transition-colors duration-300 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </Panel>
          )}
        </div>

        {/* ── Edit ─────────────────────────────────────────────── */}
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit box"
          subtitle={box.code}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Code">
                <Input
                  value={editForm.code || ""}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Label">
                <Input
                  value={editForm.label || ""}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Description">
              <Input
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Capacity">
                <Input
                  type="number"
                  value={editForm.capacity ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      capacity: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                />
              </Field>
              <Field label="Weight limit (kg)">
                <Input
                  type="number"
                  value={editForm.weightLimit ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      weightLimit: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Where it lives">
              <Input
                value={editForm.location || ""}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </Field>
            <div className="flex gap-3">
              <Action onClick={() => setEditOpen(false)} className="flex-1">
                Cancel
              </Action>
              <Action solid onClick={saveEdit} className="flex-1">
                Save
              </Action>
            </div>
          </div>
        </Modal>

        {/* ── Delete ───────────────────────────────────────────── */}
        <Modal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete this box?"
          subtitle={box.code}
        >
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {canDelete
                ? "The box goes; nothing that was in it is affected. This cannot be undone."
                : `It still holds ${stats.total} ${stats.total === 1 ? "line" : "lines"}. Take them out first — deleting a box should never quietly lose stock.`}
            </p>
            <div className="flex gap-3">
              <Action onClick={() => setDeleteOpen(false)} className="flex-1">
                Cancel
              </Action>
              <Action
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex-1 border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
              >
                Delete box
              </Action>
            </div>
          </div>
        </Modal>

        {/* ── Add loose stock ──────────────────────────────────── */}
        <Drawer
          open={addSheetOpen}
          onClose={() => setAddSheetOpen(false)}
          title="Add loose stock"
          subtitle={`Into ${box.code}`}
          footer={
            <>
              <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {addSelected.size} picked
              </span>
              <Action
                solid
                onClick={confirmAdd}
                disabled={addSelected.size === 0}
                className="ml-auto"
              >
                Add {addSelected.size > 0 ? addSelected.size : ""}
              </Action>
            </>
          }
        >
          {addLoading ? (
            <ListSkeleton rows={6} />
          ) : addCandidates.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nothing loose"
              description="Every line is already in a box."
            />
          ) : (
            <Panel>
              {addCandidates.map((it) => {
                const checked = addSelected.has(it.id);
                const id = itemIdentity(it);
                return (
                  <label
                    key={it.id}
                    className={`row-line flex cursor-pointer items-center gap-3 px-4 py-3 ${
                      checked ? "bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAddSelect(it.id)}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--brand-2)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                        {id.title}
                      </p>
                      {id.subtitle && (
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {id.subtitle}
                        </p>
                      )}
                    </div>
                    <Status status={it.status} className="shrink-0" />
                  </label>
                );
              })}
            </Panel>
          )}
        </Drawer>
      </PageShell>
    </AdminGuard>
  );
}
