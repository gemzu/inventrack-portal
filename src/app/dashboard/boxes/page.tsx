"use client";

/**
 * Boxes.
 *
 * A box was a card with a tinted rounded square holding a layers icon, a
 * secondary badge for the category, and three grey "Label: value" lines. The
 * code is the thing people actually read off this screen, so the code is what
 * is set large; everything else is caption.
 *
 * The colour a box was given still matters — it is how people find it on the
 * floor — so it stays, as the lit top edge of the panel rather than as a
 * pastel tile behind an icon.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getBoxes, createBox, getLooseItemsCount, type Box } from "@/lib/dataService";
import { Package, Plus } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Figure, CrateSkeleton } from "@/components/console/surfaces";
import {
  Action, Chip, Field, Input, Modal, SearchInput, Select,
} from "@/components/console/controls";

const BOX_CATEGORIES = [
  "general", "electronics", "clothing", "tools", "fragile",
  "heavy", "perishable", "documents", "other",
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
  code: "", label: "", description: "", color: PRESET_COLORS[0],
  category: "general", capacity: "", weightLimit: "", location: "", facilityId: "",
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
      const [b, loose] = await Promise.all([getBoxes(orgId), getLooseItemsCount(orgId)]);
      setBoxes(b);
      setLooseCount(loose);
    } catch (e) {
      toast((e as Error).message || "Failed to load boxes", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () =>
      boxes.filter((b) => {
        if (search) {
          const s = search.toLowerCase();
          if (!b.code?.toLowerCase().includes(s) && !b.label?.toLowerCase().includes(s)) return false;
        }
        if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
        if (facilityFilter !== "all" && b.facilityId !== facilityFilter) return false;
        return true;
      }),
    [boxes, search, categoryFilter, facilityFilter]
  );

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
        eyebrow="Console"
        subtitle="Containers on the floor, and what is not in one."
        actions={
          <Action solid onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New box
          </Action>
        }
      >
        <div className="space-y-8">
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Boxes shown" value={filtered.length} note={`of ${boxes.length}`} />
            <Figure
              label="Loose items"
              value={looseCount}
              tone={looseCount ? "warning" : undefined}
              note="not in any box"
            />
          </div>

          <div className="space-y-4">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Box code or label"
              aria-label="Search boxes"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Chip on={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
                Any kind
              </Chip>
              {BOX_CATEGORIES.map((c) => (
                <Chip key={c} on={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
                  {c}
                </Chip>
              ))}
            </div>
            {facilities.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Chip on={facilityFilter === "all"} onClick={() => setFacilityFilter("all")}>
                  Any site
                </Chip>
                {facilities.map((f) => (
                  <Chip
                    key={f.id}
                    on={facilityFilter === f.id}
                    onClick={() => setFacilityFilter(f.id)}
                  >
                    {f.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CrateSkeleton key={i} className="h-32 w-full" delay={i * 0.07} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No boxes here"
              description="Group items into labelled boxes to track where they are and how full they get."
            />
          ) : (
            <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((box) => (
                <Link key={box.id} href={`/dashboard/boxes/${box.id}`} className="block h-full">
                  <div className="panel panel-hover h-full p-5">
                    {/* The box's own colour, as the lit edge. */}
                    <span
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ background: box.color || "var(--brand-2)" }}
                    />
                    <p className="mono truncate text-lg font-semibold tracking-[0.02em]">
                      {box.code}
                    </p>
                    <p className="mono mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {box.category || "general"}
                      {box.label ? ` · ${box.label}` : ""}
                    </p>

                    <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                      {box.location && <p className="truncate">{box.location}</p>}
                      {facilities.find((f) => f.id === box.facilityId)?.name && (
                        <p className="truncate">
                          {facilities.find((f) => f.id === box.facilityId)?.name}
                        </p>
                      )}
                      {box.capacity != null && (
                        <p className="mono">Holds {box.capacity}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Create a box"
          subtitle="The code is what people read off the shelf"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Code">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="BOX-001"
                />
              </Field>
              <Field label="Label">
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Shelf A, row 2"
                />
              </Field>
            </div>

            <Field label="Description">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is kept in here"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Kind">
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {BOX_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Site">
                <Select
                  value={form.facilityId}
                  onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                >
                  <option value="">None</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Capacity">
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="100"
                />
              </Field>
              <Field label="Weight limit (kg)">
                <Input
                  type="number"
                  value={form.weightLimit}
                  onChange={(e) => setForm({ ...form, weightLimit: e.target.value })}
                  placeholder="25"
                />
              </Field>
            </div>

            <Field label="Where it lives">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Aisle 3, shelf B"
              />
            </Field>

            <Field label="Colour" hint="How it is spotted on the floor.">
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`Colour ${c}`}
                    className={`h-8 w-8 rounded-md border transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] ${
                      form.color === c
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>

            <div className="flex gap-3">
              <Action onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Action>
              <Action solid onClick={handleCreate} disabled={saving} className="flex-1">
                {saving ? "Creating" : "Create box"}
              </Action>
            </div>
          </div>
        </Modal>
      </PageShell>
    </AdminGuard>
  );
}
