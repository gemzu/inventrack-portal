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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Barcode</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell text-muted-foreground">Label</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell text-muted-foreground">Note</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell text-muted-foreground">Added</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Remove</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5}>
                    <EmptyState icon={ShieldCheck} title="Nothing whitelisted" description="Barcodes you add here will bypass blacklist and scanning warnings." />
                  </td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{r.barcode}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{r.label || "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{r.reason || "-"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">{r.createdAt ? formatDate(r.createdAt) : "-"}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(r.id)} aria-label="Remove"><Trash2 /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </PageShell>
    </AdminGuard>
  );
}
