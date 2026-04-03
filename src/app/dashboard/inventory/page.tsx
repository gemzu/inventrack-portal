"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Search, Filter, Download, Package, ChevronDown, Upload, Loader2, X, FileSpreadsheet, Save } from "lucide-react";
import { statusColor, formatDate } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

interface Item {
  id: string;
  modelId: string;
  barcode: string;
  displayName?: string;
  brand?: string;
  description?: string;
  quantity: number;
  status: string;
  facilityId?: string;
  costPrice?: number;
  sellingPrice?: number;
  createdAt: unknown;
  updatedAt: unknown;
}

const STATUS_DOT: Record<string, string> = {
  available: "bg-green-500",
  reserved: "bg-amber-500",
  sold: "bg-blue-500",
};

function mapItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    modelId: row.model_id as string,
    barcode: row.barcode as string,
    displayName: row.display_name as string | undefined,
    brand: row.brand as string | undefined,
    description: row.description as string | undefined,
    quantity: row.quantity as number,
    status: row.status as string,
    facilityId: row.facility_id as string | undefined,
    costPrice: row.cost_price as number | undefined,
    sellingPrice: row.selling_price as number | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default function InventoryPage() {
  const { orgId, facilities } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<{ modelId: string; quantity: number }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; errors: number } | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
      const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const modelIdx = header.findIndex((h) => h.toLowerCase().includes("model") || h.toLowerCase() === "barcode");
      const qtyIdx = header.findIndex((h) => h.toLowerCase().includes("qty") || h.toLowerCase() === "quantity");
      if (modelIdx === -1) { alert("CSV must have a 'Model ID' or 'Barcode' column"); return; }
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        return {
          modelId: cols[modelIdx] || "",
          quantity: qtyIdx >= 0 ? parseInt(cols[qtyIdx] || "0", 10) || 0 : 0,
        };
      }).filter((r) => r.modelId);
      setImportData(parsed);
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!orgId || importData.length === 0) return;
    setImporting(true);
    const result = { added: 0, updated: 0, errors: 0 };
    const existingMap = new Map<string, string>();
    items.forEach((i) => { if (i.barcode) existingMap.set(i.barcode, i.id); if (i.modelId) existingMap.set(i.modelId, i.id); });

    for (const item of importData) {
      const existingId = existingMap.get(item.modelId);
      if (existingId) {
        const { error } = await supabase.from("inventory").update({ quantity: item.quantity }).eq("id", existingId);
        if (error) { result.errors++; } else { result.updated++; }
      } else {
        const { data: newRow, error } = await supabase.from("inventory").insert({
          model_id: item.modelId, barcode: item.modelId, quantity: item.quantity,
          status: "available", reserved_by: null, reserved_at: null, reservation_expiry: null,
          org_id: orgId,
        }).select("id").single();
        if (error) { result.errors++; } else {
          result.added++;
          if (newRow) existingMap.set(item.modelId, newRow.id);
        }
      }
    }

    setImportResult(result);
    setImporting(false);
    toast(`Import complete: ${result.added} added, ${result.updated} updated`, "success");
    // Reload inventory
    const { data } = await supabase.from("inventory").select("*").eq("org_id", orgId);
    const mapped = (data || []).map(mapItem);
    setItems(mapped);
    setFiltered(mapped);
  };

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase.from("inventory").select("*").eq("org_id", orgId);
      const mapped = (data || []).map(mapItem);
      setItems(mapped);
      setFiltered(mapped);
      setLoading(false);
    };
    load();
  }, [orgId]);

  useEffect(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.modelId?.toLowerCase().includes(s) ||
          i.barcode?.toLowerCase().includes(s) ||
          i.displayName?.toLowerCase().includes(s) ||
          i.brand?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (facilityFilter !== "all") result = result.filter((i) => i.facilityId === facilityFilter);
    setFiltered(result);
  }, [search, statusFilter, facilityFilter, items]);

  const totalInventoryValue = filtered.reduce((sum, i) => sum + (i.quantity * (i.sellingPrice || 0)), 0);

  const exportCsv = () => {
    const header = "Model ID,Barcode,Name,Brand,Status,Quantity,Cost,Price,Facility\n";
    const rows = filtered.map((i) => {
      const fac = facilities.find((f) => f.id === i.facilityId)?.name || "";
      return `"${i.modelId}","${i.barcode}","${i.displayName || ""}","${i.brand || ""}","${i.status}",${i.quantity},${i.costPrice || ""},${i.sellingPrice || ""},"${fac}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
  };

  const updateStatus = async (item: Item, newStatus: string) => {
    try {
      const { error } = await supabase.from("inventory").update({ status: newStatus }).eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
      setEditItem((prev) => prev ? { ...prev, status: newStatus } : null);
      toast(`Status updated to ${newStatus}`, "success");
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const saveQuantity = async () => {
    if (!editItem) return;
    try {
      const { error } = await supabase.from("inventory").update({ quantity: editQty }).eq("id", editItem.id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...i, quantity: editQty } : i)));
      setEditItem((prev) => prev ? { ...prev, quantity: editQty } : null);
      toast("Quantity updated", "success");
    } catch {
      toast("Failed to update quantity", "error");
    }
  };

  const openPanel = (item: Item) => {
    setEditItem(item);
    setEditQty(item.quantity);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setEditItem(null), 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-page-enter space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{filtered.length} items</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition shadow-lg shadow-primary/25 press-scale">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:border-primary transition" style={{ borderColor: "var(--border)" }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model, barcode, name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
        </div>
        {facilities.length > 0 && (
          <div className="relative">
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer"
              style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="all">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Model ID</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Barcode</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--muted)" }}>Name</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Status</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Qty</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--muted)" }}>Facility</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3 font-medium">{item.modelId}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.barcode}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{item.displayName || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(item.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status] || "bg-gray-400"}`} />
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: "var(--muted)" }}>
                    {facilities.find((f) => f.id === item.facilityId)?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openPanel(item)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={Package} title="No items found" description="Import a CSV or add items from the mobile app to get started." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import CSV Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-backdrop" onClick={() => { setShowImport(false); setImportData([]); setImportResult(null); }}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Import CSV</h3>
              <button onClick={() => { setShowImport(false); setImportData([]); setImportResult(null); }}><X className="w-5 h-5" /></button>
            </div>

            {importResult ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-success" />
                </div>
                <h4 className="text-lg font-bold mb-2">Import Complete</h4>
                <div className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
                  <p><strong className="text-success">{importResult.added}</strong> items added</p>
                  <p><strong className="text-primary">{importResult.updated}</strong> items updated</p>
                  {importResult.errors > 0 && <p><strong className="text-danger">{importResult.errors}</strong> errors</p>}
                </div>
                <button onClick={() => { setShowImport(false); setImportData([]); setImportResult(null); }} className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition">
                  Done
                </button>
              </div>
            ) : importData.length > 0 ? (
              <>
                <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                  Found <strong>{importData.length}</strong> items to import. Preview:
                </p>
                <div className="max-h-60 overflow-y-auto rounded-xl border mb-4" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th className="text-left px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>Model ID</th>
                        <th className="text-left px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 20).map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="px-3 py-2 font-mono text-xs">{r.modelId}</td>
                          <td className="px-3 py-2">{r.quantity}</td>
                        </tr>
                      ))}
                      {importData.length > 20 && (
                        <tr><td colSpan={2} className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>...and {importData.length - 20} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setImportData([])} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:border-primary transition" style={{ borderColor: "var(--border)" }}>
                    Cancel
                  </button>
                  <button onClick={runImport} disabled={importing} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {importing ? "Importing..." : `Import ${importData.length} Items`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
                <p className="text-sm mb-1 font-medium">Upload a CSV file</p>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Must have a &quot;Model ID&quot; column. &quot;Qty&quot; column is optional.
                </p>
                <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium cursor-pointer hover:bg-primary-dark transition">
                  <Upload className="w-4 h-4" /> Choose File
                  <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-out Panel */}
      {editItem && (
        <>
          <div
            className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${panelOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closePanel}
          />
          <div
            className={`fixed top-0 right-0 h-full w-96 max-w-full z-50 transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}
            style={{ background: "var(--background)" }}
          >
            <div className="h-full flex flex-col border-l" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 className="text-lg font-bold">Item Details</h3>
                <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Model ID</label>
                  <div className="text-sm font-semibold">{editItem.modelId}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Barcode</label>
                  <div className="text-sm font-mono">{editItem.barcode}</div>
                </div>
                {editItem.displayName && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Display Name</label>
                    <div className="text-sm">{editItem.displayName}</div>
                  </div>
                )}
                {editItem.description && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Description</label>
                    <div className="text-sm">{editItem.description}</div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Quantity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editQty}
                      onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-24 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                      style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                    {editQty !== editItem.quantity && (
                      <button onClick={saveQuantity} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition">
                        <Save className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Status</label>
                  <div className="flex gap-2">
                    {["available", "reserved", "sold"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(editItem, s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          editItem.status === s ? "bg-primary text-white border-primary" : "hover:border-primary"
                        }`}
                        style={editItem.status !== s ? { borderColor: "var(--border)" } : undefined}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${editItem.status === s ? "bg-white" : STATUS_DOT[s] || "bg-gray-400"}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={closePanel}
                  className="w-full py-2.5 rounded-xl border text-sm font-medium hover:border-primary transition"
                  style={{ borderColor: "var(--border)" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
