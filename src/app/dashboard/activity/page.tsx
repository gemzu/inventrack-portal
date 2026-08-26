"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Activity, Search, ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import PageShell from "@/components/page-shell";

interface ScanLog {
  id: string;
  barcode: string;
  result?: string;
  action: string;
  note?: string;
  scannedBy: string;
  createdAt: unknown;
}

function mapLog(row: Record<string, unknown>): ScanLog {
  return {
    id: row.id as string,
    barcode: (row.barcode as string) || "",
    result: row.result as string | undefined,
    action: (row.action as string) || "",
    note: row.note as string | undefined,
    scannedBy: (row.scanned_by as string) || "",
    createdAt: row.created_at,
  };
}

export default function ActivityPage() {
  const { orgId } = useAuth();
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      const { data } = await supabase
        .from("scan_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      const mapped = (data || []).map(mapLog);
      setLogs(mapped);
      setLoading(false);
    };
    load();
  }, [orgId]);

  const filtered = useMemo(() => {
    let result = logs;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((l) => l.barcode?.toLowerCase().includes(s) || l.scannedBy?.toLowerCase().includes(s));
    }
    if (actionFilter !== "all") result = result.filter((l) => l.action === actionFilter);
    return result;
  }, [search, actionFilter, logs]);

  const actions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (<AdminGuard>
    <PageShell title="Activity Log" subtitle={`${filtered.length} entries`}>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by barcode or user..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
          />
        </div>
        <div className="relative">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground"
          >
            <option value="all">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      <Card className="overflow-hidden"><CardContent className="p-0">
        {filtered.length === 0 ? (
          <EmptyState icon={Activity} title="No activity logs" description="Scan events and inventory changes will be recorded here." />
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="flex items-center gap-4 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-primary/[0.03] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-medium truncate">{log.barcode}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary shrink-0 capitalize">{log.action}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {log.scannedBy}{log.result ? ` · ${log.result}` : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 hidden sm:block whitespace-nowrap">
                {formatDateTime(log.createdAt as string)}
              </div>
            </div>
          ))
        )}
      </CardContent></Card>
    </PageShell>
  </AdminGuard>);
}
