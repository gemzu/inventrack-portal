"use client";
import AdminGuard from "@/components/AdminGuard";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getWhitelist, addToWhitelist, removeFromWhitelist } from "@/lib/dataService";
import { ShieldCheck, Plus, Trash2, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Row {
  id: string;
  barcode: string;
  label?: string;
  reason?: string;
  createdAt?: string;
}

export default function WhitelistPage() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ barcode: "", label: "", reason: "" });

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await getWhitelist(orgId);
      setItems(data as unknown as Row[]);
    } catch (e) {
      toast((e as Error).message || "Failed to load whitelist", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.barcode?.toLowerCase().includes(s) || r.label?.toLowerCase().includes(s);
  });

  const add = async () => {
    if (!orgId || !form.barcode.trim()) return;
    try {
      await addToWhitelist(orgId, { barcode: form.barcode.trim(), label: form.label.trim() || undefined, reason: form.reason.trim() || undefined });
      toast("Barcode whitelisted", "success");
      setOpen(false);
      setForm({ barcode: "", label: "", reason: "" });
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to add", "error");
    }
  };

  const remove = async (id: string) => {
    try {
      await removeFromWhitelist(id);
      load();
      toast("Removed", "success");
    } catch (e) {
      toast((e as Error).message || "Failed to remove", "error");
    }
  };

  return (
    <AdminGuard>
      <PageShell
        title="Whitelist"
        subtitle={`${filtered.length} trusted barcodes`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus /> Add barcode</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Whitelist barcode</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Barcode *</label>
                  <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Enter barcode" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Label</label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Note</label>
                  <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={add}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-10" />
        </div>

        <Card className="overflow-hidden"><CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Nothing whitelisted" description="Barcodes you add here will bypass blacklist and scanning warnings." />
          ) : filtered.map((r) => (
            <div key={r.id} className="group flex items-center gap-4 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-success/[0.05] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold font-mono text-sm truncate">{r.barcode}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.label || "No label"}{r.reason ? ` · ${r.reason}` : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">{r.createdAt ? formatDate(r.createdAt) : ""}</div>
              <button onClick={() => remove(r.id)} title="Remove" className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:bg-destructive hover:text-white transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </CardContent></Card>
      </PageShell>
    </AdminGuard>
  );
}
