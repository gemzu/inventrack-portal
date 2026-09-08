"use client";

import AdminGuard from "@/components/AdminGuard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createStorefront, deleteStorefront, getStorefronts, updateStorefront,
  getFacilities, getBoxes, getInventoryPaginated,
} from "@/lib/dataService";
import { ShoppingBag, Plus, Pencil, Trash2, Copy } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import { Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Field, Input, Modal } from "@/components/console/controls";

interface Storefront {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  filterType: "all" | "combined";
  filterValue: Record<string, unknown>;
}

interface FormState {
  name: string;
  description: string;
  selectedFacilityIds: string[];
  selectedCategories: string[];
  includedBoxIds: string[];
  excludedBoxIds: string[];
  excludedItemIds: string[];
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  selectedFacilityIds: [],
  selectedCategories: [],
  includedBoxIds: [],
  excludedBoxIds: [],
  excludedItemIds: [],
};

export default function StorefrontsPage() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Storefront | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [facilities, setFacilities] = useState<Array<Record<string, unknown>>>([]);
  const [boxes, setBoxes] = useState<Array<Record<string, unknown>>>([]);
  const [inventory, setInventory] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [sfs, facs, bxs, inv] = await Promise.all([
        getStorefronts(orgId),
        getFacilities(orgId),
        getBoxes(orgId),
        getInventoryPaginated(orgId, {}, 0, 300),
      ]);
      setStorefronts((sfs as Array<Record<string, unknown>>).map((d) => ({
        id: String(d.id),
        name: String(d.name || ""),
        description: String(d.description || ""),
        inviteCode: String(d.inviteCode || ""),
        filterType: (String(d.filterType || "all") === "combined" ? "combined" : "all"),
        filterValue: (d.filterValue as Record<string, unknown>) || {},
      })));
      setFacilities((facs as unknown as Array<Record<string, unknown>>) || []);
      setBoxes((bxs as unknown as Array<Record<string, unknown>>) || []);
      setInventory((inv.items as unknown as Array<Record<string, unknown>>) || []);
    } catch (e) {
      toast((e as Error).message || "Failed to load storefront data", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(
    () => [...new Set(inventory.map((i) => String(i.category || "")).filter(Boolean))],
    [inventory]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (sf: Storefront) => {
    const fv = sf.filterValue || {};
    setEditing(sf);
    setForm({
      name: sf.name,
      description: sf.description,
      selectedFacilityIds: Array.isArray(fv.facilityIds) ? (fv.facilityIds as string[]) : [],
      selectedCategories: Array.isArray(fv.categories) ? (fv.categories as string[]) : [],
      includedBoxIds: Array.isArray(fv.boxIds) ? (fv.boxIds as string[]) : [],
      excludedBoxIds: Array.isArray(fv.excludedBoxIds) ? (fv.excludedBoxIds as string[]) : [],
      excludedItemIds: Array.isArray(fv.excludedItemIds) ? (fv.excludedItemIds as string[]) : [],
    });
    setShowForm(true);
  };

  const toggleList = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const save = async () => {
    if (!orgId || !form.name.trim()) return;
    const filterValue: Record<string, unknown> = {};
    if (form.selectedFacilityIds.length) filterValue.facilityIds = form.selectedFacilityIds;
    if (form.selectedCategories.length) filterValue.categories = form.selectedCategories;
    if (form.includedBoxIds.length) filterValue.boxIds = form.includedBoxIds;
    if (form.excludedBoxIds.length) filterValue.excludedBoxIds = form.excludedBoxIds;
    if (form.excludedItemIds.length) filterValue.excludedItemIds = form.excludedItemIds;
    
    const hasFilters = Object.keys(filterValue).length > 0;
    const filterType: "all" | "combined" = hasFilters ? "combined" : "all";

    try {
      if (editing) {
        await updateStorefront(editing.id, { name: form.name.trim(), description: form.description.trim(), filterType, filterValue });
        toast("Storefront updated", "success");
      } else {
        await createStorefront(orgId, { name: form.name.trim(), description: form.description.trim(), filterType, filterValue });
        toast("Storefront created", "success");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      toast((e as Error).message || "Failed to save storefront", "error");
    }
  };

  const remove = async (sf: Storefront) => {
    if (!confirm(`Delete "${sf.name}" storefront?`)) return;
    try {
      await deleteStorefront(sf.id);
      setStorefronts((prev) => prev.filter((s) => s.id !== sf.id));
      toast("Storefront deleted", "success");
    } catch (e) {
      toast((e as Error).message || "Failed to delete storefront", "error");
    }
  };

  if (loading) return <ListSkeleton />;

  return (
    <AdminGuard>
      <PageShell
        title="Storefronts"
        subtitle="A storefront is a filtered view of your stock with its own join code. Buyers only ever see what the filters let through."
        actions={
          <Action solid onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New storefront
          </Action>
        }
      >
        <div className="space-y-8">
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Storefronts" value={storefronts.length} />
          </div>

          {storefronts.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No storefronts"
              description="Create one, set its filters, and hand out the code."
            />
          ) : (
            <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storefronts.map((sf) => {
                const bans = (sf.filterValue?.excludedItemIds as unknown[] | undefined)?.length || 0;
                return (
                  <div key={sf.id} className="panel group h-full p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display truncate text-[15px] font-bold tracking-[-0.015em]">
                        {sf.name}
                      </p>
                      <div className="flex shrink-0 gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(sf)}
                          aria-label={`Edit ${sf.name}`}
                          className="text-muted-foreground transition-colors duration-300 hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(sf)}
                          aria-label={`Delete ${sf.name}`}
                          className="text-muted-foreground transition-colors duration-300 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                      {sf.description || "No description."}
                    </p>

                    {/* The join code is what gets handed out, so it is set
                        like a code rather than tucked into a grey strip. */}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <div className="min-w-0">
                        <ColHead className="block">Join code</ColHead>
                        <p className="mono mt-1 truncate text-base font-semibold tracking-[0.08em]">
                          {sf.inviteCode}
                        </p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(sf.inviteCode)}
                        aria-label="Copy join code"
                        className="shrink-0 text-muted-foreground transition-colors duration-300 hover:text-[var(--brand-2)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="mt-3 truncate text-[12px] text-muted-foreground">
                      {sf.filterType === "all" ? "Everything" : "Filtered"}
                      {bans ? ` · ${bans} item ${bans === 1 ? "ban" : "bans"}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={editing ? "Edit storefront" : "New storefront"}
          subtitle="What buyers on this code are allowed to see"
          wide
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Premium hub"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Who is this for?"
                />
              </Field>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <PickChips
                title="Sites"
                values={facilities.map((f) => ({ id: String(f.id), label: String(f.name || "") }))}
                selected={form.selectedFacilityIds}
                onToggle={(id) => toggleList("selectedFacilityIds", id)}
              />
              <PickChips
                title="Categories"
                values={categories.map((c) => ({ id: c, label: c }))}
                selected={form.selectedCategories}
                onToggle={(id) => toggleList("selectedCategories", id)}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <PickList
                title="Boxes shown"
                items={boxes.map((b) => ({ id: String(b.id), label: String(b.code || "") }))}
                selected={form.includedBoxIds}
                onToggle={(id) => toggleList("includedBoxIds", id)}
              />
              <PickList
                title="Boxes hidden"
                items={boxes.map((b) => ({ id: String(b.id), label: String(b.code || "") }))}
                selected={form.excludedBoxIds}
                onToggle={(id) => toggleList("excludedBoxIds", id)}
                deny
              />
              <PickList
                title="Items hidden"
                items={inventory.slice(0, 150).map((i) => ({
                  id: String(i.id),
                  label: String(i.modelId || i.barcode || "Item"),
                }))}
                selected={form.excludedItemIds}
                onToggle={(id) => toggleList("excludedItemIds", id)}
                deny
              />
            </div>

            <div className="flex gap-3 border-t border-border pt-5">
              <Action onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Action>
              <Action solid onClick={save} className="flex-1">
                {editing ? "Save changes" : "Create storefront"}
              </Action>
            </div>
          </div>
        </Modal>
      </PageShell>
    </AdminGuard>
  );
}

/* A short set of options, as chips. */
function PickChips({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <ColHead className="mb-2 block">{title}</ColHead>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <p className="text-xs text-muted-foreground">None set up yet.</p>
        ) : (
          values.map((v) => (
            <Chip key={v.id} on={selected.includes(v.id)} onClick={() => onToggle(v.id)}>
              {v.label}
            </Chip>
          ))
        )}
      </div>
    </div>
  );
}

/* A long set, as a scrolling list. Denial reads red, permission reads brand —
   the only place in the console where a list row takes colour, because
   hiding stock from a buyer is worth being obvious about. */
function PickList({
  title,
  items,
  selected,
  onToggle,
  deny = false,
}: {
  title: string;
  items: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
  deny?: boolean;
}) {
  return (
    <div>
      <ColHead className="mb-2 block">{title}</ColHead>
      <div className="panel max-h-44 space-y-0.5 overflow-auto p-1.5">
        {items.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">Nothing to pick from.</p>
        ) : (
          items.map((it) => {
            const on = selected.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onToggle(it.id)}
                className={`mono w-full truncate rounded-sm px-2 py-1.5 text-left text-[11px] transition-colors duration-300 ${
                  on
                    ? deny
                      ? "bg-destructive/15 text-destructive"
                      : "bg-[color-mix(in_oklab,var(--brand-2)_15%,transparent)] text-[var(--brand-2)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {it.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
