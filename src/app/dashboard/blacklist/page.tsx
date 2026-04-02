"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ban, Plus, Trash2, Search, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

interface BlacklistItem {
  id: string;
  barcode: string;
  label?: string;
  quantity?: number;
  reason?: string;
  createdAt: unknown;
}

function mapBlacklistItem(row: Record<string, unknown>): BlacklistItem {
  return {
    id: row.id as string,
    barcode: (row.barcode as string) || "",
    label: row.label as string | undefined,
    quantity: row.quantity as number | undefined,
    reason: row.reason as string | undefined,
    createdAt: row.created_at,
  };
}

export default function BlacklistPage() {
  const { orgId } = useAuth();
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [filtered, setFiltered] = useState<BlacklistItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ barcode: "", label: "", reason: "" });
  const { toast } = useToast();

  const load = async () => {
    if (!orgId) return;
    const { data } = await supabase.from("blacklist").select("*").eq("org_id", orgId);
    const mapped = (data || []).map(mapBlacklistItem);
    setItems(mapped);
    setFiltered(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  useEffect(() => {
    if (!search) { setFiltered(items); return; }
    const s = search.toLowerCase();
    setFiltered(items.filter((i) => i.barcode?.toLowerCase().includes(s) || i.label?.toLowerCase().includes(s)));
  }, [search, items]);

  const handleAdd = async () => {
    if (!orgId || !form.barcode) return;
    try {
      const { error } = await supabase.from("blacklist").insert({
        barcode: form.barcode, label: form.label, reason: form.reason,
        org_id: orgId,
      });
      if (error) throw error;
      setShowForm(false);
      setForm({ barcode: "", label: "", reason: "" });
      await load();
      toast("Barcode added to blacklist", "success");
    } catch {
      toast("Failed to add barcode", "error");
    }
  };

  const handleDelete = async (item: BlacklistItem) => {
    try {
      const { error } = await supabase.from("blacklist").delete().eq("id", item.id);
      if (error) throw error;
      await load();
      toast("Barcode removed from blacklist", "success");
    } catch {
      toast("Failed to remove barcode", "error");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (<AdminGuard>
    <div className="animate-page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blacklist</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{filtered.length} blocked barcodes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger text-white text-sm font-medium hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> Add Barcode
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search barcodes..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Barcode</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--muted)" }}>Label</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--muted)" }}>Reason</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--muted)" }}>Added</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{item.barcode}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{item.label || "-"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: "var(--muted)" }}>{item.reason || "-"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>{formatDate(item.createdAt as string)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Ban} title="No blacklisted barcodes" description="Add barcodes here to prevent them from being scanned or submitted." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-backdrop" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Blacklist Barcode</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Barcode</label>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Enter barcode" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Label (optional)</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Item name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Why is this blocked?" />
              </div>
              <button onClick={handleAdd} className="w-full py-2.5 rounded-xl bg-danger text-white font-medium hover:opacity-90 transition press-scale">
                Add to Blacklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </AdminGuard>);
}
