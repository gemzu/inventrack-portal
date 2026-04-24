"use client";

import AdminGuard from "@/components/AdminGuard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createStorefront, deleteStorefront, getStorefronts, updateStorefront,
  getFacilities, getBoxes, getInventoryPaginated,
} from "@/lib/dataService";
import { ShoppingBag, Plus, Pencil, Trash2, Tag, MapPin, Globe, Copy, X, Ban, Package } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/page-shell";

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <AdminGuard>
      <PageShell
        title="Storefronts"
        subtitle="App-style filtering: facilities + categories + include/exclude lists."
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Create Storefront</Button>}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storefronts.map((sf) => (
            <Card key={sf.id} className="relative overflow-hidden group border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(sf)}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-500/10" onClick={() => remove(sf)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{sf.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{sf.description || "No description provided."}</p>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border font-mono text-xs">
                  <span className="text-muted-foreground">Code:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{sf.inviteCode}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => navigator.clipboard.writeText(sf.inviteCode)} className="h-6 w-6"><Copy className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-foreground">
                    {sf.filterType === "all" ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {sf.filterType}
                  </div>
                  {(sf.filterValue?.excludedItemIds as unknown[] | undefined)?.length ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive"><Ban className="w-3 h-3" /> item bans</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          {storefronts.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={ShoppingBag} title="No Storefronts" description="Create a storefront and set filters exactly like the app." />
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <Card className="w-full max-w-4xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{editing ? "Edit Storefront" : "Create Storefront"}</h3>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}><X className="w-5 h-5" /></Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Name</label>
                    <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Premium Hub" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Description</label>
                    <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Who is this for?" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <MultiPill title="Facilities" icon={<MapPin className="w-3 h-3" />} values={facilities.map((f) => ({ id: String(f.id), label: String(f.name || "") }))} selected={form.selectedFacilityIds} onToggle={(id) => toggleList("selectedFacilityIds", id)} />
                  <MultiPill title="Categories" icon={<Tag className="w-3 h-3" />} values={categories.map((c) => ({ id: c, label: c }))} selected={form.selectedCategories} onToggle={(id) => toggleList("selectedCategories", id)} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <MultiList title="Include Boxes" icon={<Package className="w-3 h-3" />} items={boxes.map((b) => ({ id: String(b.id), label: String(b.code || "") }))} selected={form.includedBoxIds} onToggle={(id) => toggleList("includedBoxIds", id)} tone="primary" />
                  <MultiList title="Exclude Boxes" icon={<Ban className="w-3 h-3" />} items={boxes.map((b) => ({ id: String(b.id), label: String(b.code || "") }))} selected={form.excludedBoxIds} onToggle={(id) => toggleList("excludedBoxIds", id)} tone="danger" />
                  <MultiList title="Exclude Items" icon={<Ban className="w-3 h-3" />} items={inventory.slice(0, 150).map((i) => ({ id: String(i.id), label: String(i.modelId || i.barcode || "Item") }))} selected={form.excludedItemIds} onToggle={(id) => toggleList("excludedItemIds", id)} tone="danger" />
                </div>
                <Button className="w-full h-11" onClick={save}>{editing ? "Save Changes" : "Create Storefront"}</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </PageShell>
    </AdminGuard>
  );
}

function MultiPill({ title, icon, values, selected, onToggle }: { title: string; icon: React.ReactNode; values: Array<{ id: string; label: string }>; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Button key={v.id} size="sm" variant={selected.includes(v.id) ? "default" : "outline"} onClick={() => onToggle(v.id)}>
            {icon} {v.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MultiList({ title, icon, items, selected, onToggle, tone }: { title: string; icon: React.ReactNode; items: Array<{ id: string; label: string }>; selected: string[]; onToggle: (id: string) => void; tone: "primary" | "danger" }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</label>
      <div className="max-h-44 overflow-auto rounded-lg border p-2 space-y-1">
        {items.map((it) => (
          <button key={it.id} type="button" onClick={() => onToggle(it.id)} className={`w-full text-left px-2 py-1.5 rounded text-xs ${selected.includes(it.id) ? (tone === "danger" ? "bg-red-500/15 text-red-500" : "bg-primary/15 text-primary") : "hover:bg-muted"}`}>
            {icon} <span className="ml-1">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
