"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Search, Filter, Download, Package, ChevronDown } from "lucide-react";
import { statusColor, formatDate } from "@/lib/utils";

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
  createdAt: unknown;
  updatedAt: unknown;
}

export default function InventoryPage() {
  const { orgId, facilities } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Item | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const snap = await getDocs(query(collection(db, "inventory"), where("orgId", "==", orgId)));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
      setItems(data);
      setFiltered(data);
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

  const exportCsv = () => {
    const header = "Model ID,Barcode,Name,Brand,Status,Quantity,Facility\n";
    const rows = filtered.map((i) => {
      const fac = facilities.find((f) => f.id === i.facilityId)?.name || "";
      return `"${i.modelId}","${i.barcode}","${i.displayName || ""}","${i.brand || ""}","${i.status}",${i.quantity},"${fac}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
  };

  const updateStatus = async (item: Item, newStatus: string) => {
    await updateDoc(doc(db, "inventory", item.id), { status: newStatus });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
    setEditItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{filtered.length} items</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:border-primary transition" style={{ borderColor: "var(--border)" }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
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
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: "var(--muted)" }}>
                    {facilities.find((f) => f.id === item.facilityId)?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditItem(editItem?.id === item.id ? null : item)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--muted)" }}>
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Edit Item</h3>
            <div className="space-y-3 text-sm">
              <div><span style={{ color: "var(--muted)" }}>Model:</span> <strong>{editItem.modelId}</strong></div>
              <div><span style={{ color: "var(--muted)" }}>Barcode:</span> <strong>{editItem.barcode}</strong></div>
              <div><span style={{ color: "var(--muted)" }}>Qty:</span> <strong>{editItem.quantity}</strong></div>
              <div>
                <span style={{ color: "var(--muted)" }}>Status:</span>
                <div className="flex gap-2 mt-2">
                  {["available", "reserved", "sold"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(editItem, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        editItem.status === s ? "bg-primary text-white border-primary" : "hover:border-primary"
                      }`}
                      style={editItem.status !== s ? { borderColor: "var(--border)" } : undefined}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditItem(null)}
              className="mt-6 w-full py-2 rounded-xl border text-sm font-medium hover:border-primary transition"
              style={{ borderColor: "var(--border)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
