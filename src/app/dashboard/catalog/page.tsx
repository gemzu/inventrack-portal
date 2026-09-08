"use client";

/**
 * Product catalog.
 *
 * Every product ever entered, keyed by UPC, whether or not it is in stock now.
 * The "IN STOCK" / "HISTORY" capsules are gone — that is a state, and states
 * are the shared marker everywhere else in the console.
 */

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Download, BookOpen } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Status from "@/components/Status";
import { useToast } from "@/components/Toast";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, SearchInput } from "@/components/console/controls";

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
        supabase.from("product_catalog").select("*").eq("org_id", orgId)
          .order("last_seen_at", { ascending: false }).limit(1000),
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

  const inStockCount = useMemo(
    () => filtered.filter((r) => live.has(str(r.barcode).trim())).length,
    [filtered, live]
  );

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
    <AdminGuard>
      <PageShell
        title="Catalog"
        eyebrow="Console"
        subtitle="Every product this organisation has ever entered, keyed by UPC — including the ones no longer on the floor. Search a code to find out what it was."
        actions={
          <Action onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export
          </Action>
        }
      >
        {loading ? (
          <ListSkeleton rows={7} />
        ) : (
          <div className="space-y-8">
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label="Products" value={filtered.length} />
              <Figure label="On the floor now" value={inStockCount} />
              <Figure label="History only" value={filtered.length - inStockCount} />
            </div>

            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="UPC, brand, part number, or name"
              aria-label="Search the catalog"
              className="max-w-xl"
            />

            {filtered.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={rows.length === 0 ? "Catalog is empty" : "Nothing matches"}
                description={
                  rows.length === 0
                    ? "Products appear here as they are added or edited, on the app or the portal."
                    : "Try a different UPC, brand, or part number."
                }
              />
            ) : (
              <Panel className="reveal">
                <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                  <ColHead className="min-w-0 flex-1">Product</ColHead>
                  <ColHead className="w-40 shrink-0">UPC</ColHead>
                  <ColHead className="w-32 shrink-0">State</ColHead>
                </div>

                {filtered.map((r) => {
                  const inStock = live.has(str(r.barcode).trim());
                  return (
                    <div key={str(r.id)} className="row-line flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {str(r.display_name) || str(r.model_id) || str(r.part_number) || "Unnamed product"}
                        </p>
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {str(r.brand) || "Unknown brand"}
                          {r.category ? ` · ${str(r.category)}` : ""}
                          {r.part_number ? ` · #${str(r.part_number)}` : ""}
                        </p>
                      </div>
                      <span className="mono hidden w-40 shrink-0 truncate text-sm md:block">
                        {str(r.barcode)}
                      </span>
                      <div className="w-32 shrink-0">
                        <Status
                          status={inStock ? "available" : "archived"}
                          label={inStock ? "On the floor" : "History"}
                        />
                      </div>
                    </div>
                  );
                })}
              </Panel>
            )}
          </div>
        )}
      </PageShell>
    </AdminGuard>
  );
}
