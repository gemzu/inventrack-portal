"use client";

/**
 * Facilities.
 *
 * Was a grid of cards, each led by a tinted rounded square holding a building
 * icon, then the name, then two grey lines each prefixed by a smaller icon.
 * Three icons per card to say "this is a place, in a region, with people in
 * it" — which the words already said.
 *
 * Now: the headcount is the figure, the name and where it is are the caption,
 * and the two actions live on the row rather than as tinted buttons on top.
 */

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Figure, ListSkeleton } from "@/components/console/surfaces";
import { Action, Field, Input, Modal } from "@/components/console/controls";

interface Facility {
  id: string;
  name: string;
  state: string;
  address: string;
  userCount?: number;
}

export default function FacilitiesPage() {
  const { orgId } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState({ name: "", state: "", address: "" });
  const { toast } = useToast();

  const loadFacilities = useCallback(async () => {
    if (!orgId) return;
    const { data: facData } = await supabase.from("facilities").select("*").eq("org_id", orgId);
    const { data: usrData } = await supabase.from("users").select("facility_id").eq("org_id", orgId);
    const userCounts: Record<string, number> = {};
    (usrData || []).forEach((d) => {
      const fid = d.facility_id;
      if (fid) userCounts[fid] = (userCounts[fid] || 0) + 1;
    });
    setFacilities(
      (facData || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        name: d.name as string,
        state: (d.state as string) || "",
        address: (d.address as string) || "",
        userCount: userCounts[d.id as string] || 0,
      }))
    );
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);

  const handleSave = async () => {
    if (!orgId || !form.name) return;
    try {
      if (editing) {
        const { error } = await supabase.from("facilities").update({
          name: form.name, state: form.state, address: form.address,
        }).eq("id", editing.id);
        if (error) throw error;
        toast("Facility updated", "success");
      } else {
        const { error } = await supabase.from("facilities").insert({
          name: form.name, state: form.state, address: form.address, org_id: orgId,
        });
        if (error) throw error;
        toast("Facility added", "success");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", state: "", address: "" });
      await loadFacilities();
    } catch {
      toast("Failed to save facility", "error");
    }
  };

  const handleDelete = async (fac: Facility) => {
    if (!orgId) return;
    if (!confirm(`Delete ${fac.name}? Stock and people assigned to it keep their records.`)) return;
    try {
      const { error } = await supabase.from("facilities").delete().eq("id", fac.id);
      if (error) throw error;
      await loadFacilities();
      toast("Facility deleted", "success");
    } catch {
      toast("Failed to delete facility", "error");
    }
  };

  const openEdit = (fac: Facility) => {
    setEditing(fac);
    setForm({ name: fac.name, state: fac.state, address: fac.address });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", state: "", address: "" });
    setShowForm(true);
  };

  if (loading) {
    return (
      <AdminGuard>
        <PageShell title="Sites" subtitle="Reading your locations.">
          <ListSkeleton rows={4} />
        </PageShell>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <PageShell
        title="Sites"
        subtitle="Warehouses and storage locations, and who is assigned to each."
        actions={
          <Action solid onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> Add site
          </Action>
        }
      >
        {facilities.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No sites yet"
            description="Add your first warehouse or storage location, then assign stock and people to it."
          />
        ) : (
          <div className="reveal grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((fac) => (
              <div key={fac.id} className="group relative bg-background p-5">
                <Figure
                  label="People assigned"
                  value={fac.userCount || 0}
                  className="[&_.figure-value]:text-3xl"
                />
                <p className="mt-4 truncate border-t border-border pt-3 text-sm font-medium">
                  {fac.name}
                </p>
                <p className="mono truncate text-[12px] text-muted-foreground">
                  {fac.state || "No region"}
                  {fac.address ? ` · ${fac.address}` : ""}
                </p>

                <div className="absolute right-4 top-4 flex gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(fac)}
                    aria-label={`Edit ${fac.name}`}
                    className="text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(fac)}
                    aria-label={`Delete ${fac.name}`}
                    className="text-muted-foreground transition-colors duration-300 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={editing ? "Edit site" : "Add a site"}
          subtitle={editing ? editing.name : "Somewhere stock physically lives"}
        >
          <div className="space-y-5">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Warehouse A"
              />
            </Field>
            <Field label="Region">
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="California"
              />
            </Field>
            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Main St"
              />
            </Field>
            <Action solid onClick={handleSave} className="w-full">
              {editing ? "Save changes" : "Add site"}
            </Action>
          </div>
        </Modal>
      </PageShell>
    </AdminGuard>
  );
}
