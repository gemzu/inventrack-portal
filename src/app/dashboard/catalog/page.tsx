"use client";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Search, Download, BookOpen, X } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

export default function CatalogPage() {
  const { orgId } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [live, setLive] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const [{ data: cat }, { data: inv }] = await Promise.all([
        supabase.from("product_catalog").select("*").eq("org_id", orgId).order("last_seen_at", { ascending: false }).limit(1000),
        supabase.from("inventory").select("barcode").eq("org_id", orgId),
      ]);
      setRows((cat as Row[]) || []);
      setLive(new Set(((inv as Row[]) || []).map((i) => str(i.barcode).trim()).filter(Boolean)));
      setLoading(false);
    };
    load();
  }, [orgId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      str(r.barcode).toLowerCase().includes(s) ||
      str(r.brand).toLowerCase().includes(s) ||
      str(r.part_number).toLowerCase().includes(s) ||
      str(r.model_id).toLowerCase().includes(s) ||
      str(r.display_name).toLowerCase().includes(s)
    );
  }, [rows, search]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = ["UPC", "Name", "Brand", "Model ID", "Part #", "Category", "In stock now", "Last seen"];
    const lines = filtered.map((r) => [
      str(r.barcode), str(r.display_name), str(r.brand), str(r.model_id), str(r.part_number), str(r.category),
      live.has(str(r.barcode).trim()) ? "Yes" : "No",
      r.last_seen_at ? new Date(str(r.last_seen_at)).toISOString().slice(0, 10) : "",
    ].map((c) => `"${c.replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Catalog exported", "success");
  };

  return (
    <AdminGuard><PageShell
      title="Product Catalog"
      subtitle={`${filtered.length} product${filtered.length !== 1 ? "s" : ""} ever entered`}
      actions={
        <Button variant="outline" onClick={exportCsv} className="h-10 px-4">
          <Download className="w-4 h-4" /> Export
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
        Every product ever entered, keyed by UPC — even if it&apos;s no longer in inventory. Search any UPC, brand,
        or part number to find out which product it was.
      </p>

      {/* Search */}
      <div className="relative mb-4 max-w-xl">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search UPC, brand, part #, name..."
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading catalog…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={rows.length === 0 ? "Catalog is empty" : "No matches"}
          description={rows.length === 0
            ? "Products appear here as they are added or edited on the app or portal."
            : "Try a different UPC, brand, or part number."}
        />
      ) : (
        <Card><CardContent className="p-0 divide-y divide-border">
          {filtered.map((r) => {
            const inStock = live.has(str(r.barcode).trim());
            return (
              <div key={str(r.id)} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">
                    {str(r.display_name) || str(r.model_id) || str(r.part_number) || "Unnamed product"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {str(r.brand) || "Unknown brand"}
                    {r.category ? ` · ${str(r.category)}` : ""}
                    {r.part_number ? ` · #${str(r.part_number)}` : ""}
                  </div>
                  <div className="text-xs font-semibold text-primary mt-1 font-mono">UPC {str(r.barcode)}</div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${inStock ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  {inStock ? "IN STOCK" : "HISTORY"}
                </span>
              </div>
            );
          })}
        </CardContent></Card>
      )}
    </PageShell></AdminGuard>
  );
}
