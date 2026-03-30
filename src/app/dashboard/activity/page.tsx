"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Activity, Search, ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";

interface ScanLog {
  id: string;
  barcode: string;
  result?: string;
  action: string;
  note?: string;
  scannedBy: string;
  createdAt: unknown;
}

export default function ActivityPage() {
  const { orgId } = useAuth();
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [filtered, setFiltered] = useState<ScanLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const snap = await getDocs(
        query(collection(db, "scan_logs"), where("orgId", "==", orgId), orderBy("createdAt", "desc"), limit(200))
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScanLog));
      setLogs(data);
      setFiltered(data);
      setLoading(false);
    };
    load();
  }, [orgId]);

  useEffect(() => {
    let result = logs;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((l) => l.barcode?.toLowerCase().includes(s) || l.scannedBy?.toLowerCase().includes(s));
    }
    if (actionFilter !== "all") result = result.filter((l) => l.action === actionFilter);
    setFiltered(result);
  }, [search, actionFilter, logs]);

  const actions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (<AdminGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{filtered.length} entries</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by barcode or user..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <div className="relative">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <option value="all">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Barcode</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Action</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--muted)" }}>Result</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>User</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--muted)" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">{log.barcode}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: "var(--muted)" }}>{log.result || "-"}</td>
                  <td className="px-4 py-3 text-xs">{log.scannedBy}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>
                    {formatDateTime(log.createdAt as { seconds: number })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Activity} title="No activity logs" description="Scan events and inventory changes will be recorded here." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminGuard>);
}
