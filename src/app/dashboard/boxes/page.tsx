"use client";
import AdminGuard from "@/components/AdminGuard";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getBoxes,
  createBox,
  getLooseItemsCount,
  type Box,
} from "@/lib/dataService";
import { Package, Plus, Search, Layers } from "lucide-react";
import PageShell from "@/components/page-shell";
import GlassCard from "@/components/glass-card";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const BOX_CATEGORIES = [
  "general",
  "electronics",
  "clothing",
  "tools",
  "fragile",
  "heavy",
  "perishable",
  "documents",
  "other",
];

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#8b5cf6", "#ef4444", "#64748b",
];

interface NewBoxForm {
  code: string;
  label: string;
  description: string;
  color: string;
  category: string;
  capacity: string;
  weightLimit: string;
  location: string;
  facilityId: string;
}

const emptyForm: NewBoxForm = {
  code: "",
  label: "",
  description: "",
  color: PRESET_COLORS[0],
  category: "general",
  capacity: "",
  weightLimit: "",
  location: "",
  facilityId: "",
};

export default function BoxesPage() {
  const { orgId, facilities } = useAuth();
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [looseCount, setLooseCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewBoxForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [b, loose] = await Promise.all([
        getBoxes(orgId),
        getLooseItemsCount(orgId),
      ]);
      setBoxes(b);
      setLooseCount(loose);
    } catch (e) {
      toast((e as Error).message || "Failed to load boxes", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = boxes.filter((b) => {
    if (search) {
      const s = search.toLowerCase();
      if (!b.code?.toLowerCase().includes(s) && !b.label?.toLowerCase().includes(s)) return false;
    }
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (facilityFilter !== "all" && b.facilityId !== facilityFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!orgId) return;
    if (!form.code.trim()) {
      toast("Box code is required", "error");
      return;
    }
    setSaving(true);
    try {
      await createBox(orgId, {
        code: form.code.trim(),
        label: form.label.trim() || undefined,
        description: form.description.trim() || undefined,
        color: form.color,
        category: form.category,
        capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        weightLimit: form.weightLimit ? parseFloat(form.weightLimit) : undefined,
        location: form.location.trim() || undefined,
        facilityId: form.facilityId || null,
      });
      toast("Box created", "success");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to create box", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <PageShell
        title="Boxes"
        subtitle={`${filtered.length} of ${boxes.length} containers • ${looseCount} loose items`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus /> New Box
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create box</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Code *</label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="BOX-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Label</label>
                    <Input
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="Shelf A, row 2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Description</label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What's kept in here"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                      {BOX_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Facility</label>
                    <select
                      value={form.facilityId}
                      onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                      <option value="">None</option>
                      {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Capacity</label>
                    <Input
                      type="number"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Weight limit (kg)</label>
                    <Input
                      type="number"
                      value={form.weightLimit}
                      onChange={(e) => setForm({ ...form, weightLimit: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Location</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Aisle 3, Shelf B"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-full border-2 transition ${form.color === c ? "border-foreground" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or label..."
              className="pl-9 h-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
          >
            <option value="all">All categories</option>
            {BOX_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {facilities.length > 0 && (
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
            >
              <option value="all">All facilities</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Card key={i}><CardContent className="p-6 h-32 animate-pulse bg-muted/40" /></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              icon={Package}
              title="No boxes yet"
              description="Group items into labelled boxes to track location and capacity at a glance."
            />
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((box) => <BoxCard key={box.id} box={box} facilityName={facilities.find((f) => f.id === box.facilityId)?.name} />)}
          </div>
        )}
      </PageShell>
    </AdminGuard>
  );
}

function BoxCard({ box, facilityName }: { box: Box; facilityName?: string }) {
  return (
    <Link href={`/dashboard/boxes/${box.id}`} className="block group">
      <GlassCard className="h-full transition hover:border-primary/60 group-hover:-translate-y-0.5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: (box.color || "#6366f1") + "33", color: box.color || "#6366f1" }}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">{box.code}</span>
              {box.category && <Badge variant="secondary">{box.category}</Badge>}
            </div>
            {box.label && <div className="text-xs text-muted-foreground truncate mt-0.5">{box.label}</div>}
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {box.location && <div className="truncate">Location: {box.location}</div>}
          {facilityName && <div className="truncate">Facility: {facilityName}</div>}
          {box.capacity != null && <div>Capacity: {box.capacity}</div>}
        </div>
      </GlassCard>
    </Link>
  );
}
