"use client";
import AdminGuard from "@/components/AdminGuard";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Ban, Plus, Trash2, Search, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/page-shell";
import { ListSkeleton } from "@/components/console/surfaces";

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

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase.from("blacklist").select("*").eq("org_id", orgId);
    const mapped = (data || []).map(mapBlacklistItem);
    setItems(mapped);
    setFiltered(mapped);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

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
    return <ListSkeleton />;
  }

  return (<AdminGuard>
    <PageShell
      title="Blacklist"
      subtitle={`${filtered.length} blocked barcode${filtered.length !== 1 ? "s" : ""}`}
      actions={
        <Button variant="destructive" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Barcode
        </Button>
      }
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search barcodes..."
          className="w-full pl-10 pr-4 py-2.5 rounded-md border text-sm outline-none focus:border-[var(--brand-2)] focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-2)_60%,transparent)] transition bg-input border-border text-foreground"
        />
      </div>

      <Card className="overflow-hidden"><CardContent className="p-0">
        {filtered.length === 0 ? (
          <EmptyState icon={Ban} title="No blacklisted barcodes" description="Add barcodes here to prevent them from being scanned or submitted." />
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="group flex items-center gap-4 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-destructive/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Ban className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold font-mono text-sm truncate">{item.barcode}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {item.label || "No label"}{item.reason ? ` · ${item.reason}` : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">{formatDate(item.createdAt as string)}</div>
              <button onClick={() => handleDelete(item)} title="Remove" className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:bg-destructive hover:text-white transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </CardContent></Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md"><CardContent className="p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Blacklist Barcode</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Barcode</label>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-md border text-sm outline-none focus:border-[var(--brand-2)] focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-2)_60%,transparent)] transition bg-input border-border text-foreground" placeholder="Enter barcode" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Label (optional)</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-md border text-sm outline-none focus:border-[var(--brand-2)] focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-2)_60%,transparent)] transition bg-input border-border text-foreground" placeholder="Item name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-md border text-sm outline-none focus:border-[var(--brand-2)] focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-2)_60%,transparent)] transition bg-input border-border text-foreground" placeholder="Why is this blocked?" />
              </div>
              <Button variant="destructive" onClick={handleAdd} className="w-full h-11">
                Add to Blacklist
              </Button>
            </div>
          </CardContent></Card>
        </div>
      )}
    </PageShell>
  </AdminGuard>);
}
