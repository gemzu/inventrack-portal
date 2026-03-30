"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Building2, Plus, Pencil, Trash2, MapPin, Users, X } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

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

  const loadFacilities = async () => {
    if (!orgId) return;
    const facSnap = await getDocs(collection(db, "organizations", orgId, "facilities"));
    const usrSnap = await getDocs(query(collection(db, "users"), where("orgId", "==", orgId)));
    const userCounts: Record<string, number> = {};
    usrSnap.docs.forEach((d) => {
      const fid = d.data().facilityId;
      if (fid) userCounts[fid] = (userCounts[fid] || 0) + 1;
    });
    setFacilities(
      facSnap.docs.map((d) => ({ id: d.id, ...d.data(), userCount: userCounts[d.id] || 0 } as Facility))
    );
    setLoading(false);
  };

  useEffect(() => { loadFacilities(); }, [orgId]);

  const handleSave = async () => {
    if (!orgId || !form.name) return;
    try {
      if (editing) {
        await updateDoc(doc(db, "organizations", orgId, "facilities", editing.id), {
          name: form.name, state: form.state, address: form.address, updatedAt: serverTimestamp(),
        });
        toast("Facility updated", "success");
      } else {
        await addDoc(collection(db, "organizations", orgId, "facilities"), {
          name: form.name, state: form.state, address: form.address, createdAt: serverTimestamp(),
        });
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
    try {
      await deleteDoc(doc(db, "organizations", orgId, "facilities", fac.id));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (<AdminGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facilities</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{facilities.length} locations</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", state: "", address: "" }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" /> Add Facility
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map((fac) => (
          <div key={fac.id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(fac)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <Pencil className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
                </button>
                <button onClick={() => handleDelete(fac)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-lg">{fac.name}</h3>
            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: "var(--muted)" }}>
              <MapPin className="w-3 h-3" /> {fac.state || "N/A"}{fac.address ? ` - ${fac.address}` : ""}
            </div>
            <div className="flex items-center gap-1 text-xs mt-2" style={{ color: "var(--muted)" }}>
              <Users className="w-3 h-3" /> {fac.userCount || 0} assigned
            </div>
          </div>
        ))}
        {facilities.length === 0 && (
          <div className="col-span-full">
            <EmptyState icon={Building2} title="No facilities yet" description="Add your first warehouse or storage location to get started." />
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? "Edit Facility" : "Add Facility"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  placeholder="Warehouse A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State / Region</label>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  placeholder="California"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  placeholder="123 Main St"
                />
              </div>
              <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition">
                {editing ? "Update" : "Add"} Facility
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </AdminGuard>);
}
