"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/page-shell";
import { Activity } from "lucide-react";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Chip, SearchInput } from "@/components/console/controls";

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
    return (
      <AdminGuard>
        <PageShell title="Activity" subtitle="Reading the log." eyebrow="Console">
          <ListSkeleton />
        </PageShell>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <PageShell
        title="Activity"
        eyebrow="Console"
        subtitle="Every scan the floor has recorded, newest first."
      >
        <div className="space-y-8">
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Entries shown" value={filtered.length} />
            <Figure label="Kinds of action" value={actions.length} />
          </div>

          <div className="space-y-4">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Barcode or person"
              aria-label="Search activity"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Chip on={actionFilter === "all"} onClick={() => setActionFilter("all")}>
                Any action
              </Chip>
              {actions.map((a) => (
                <Chip key={a} on={actionFilter === a} onClick={() => setActionFilter(a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>

          {/* The log is a ledger: code, what happened, who, when. An icon in a
              grey square on every line only repeats what the column already
              says. */}
          <Panel className="reveal">
            <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
              <ColHead className="min-w-0 flex-1">Code</ColHead>
              <ColHead className="w-28 shrink-0">Action</ColHead>
              <ColHead className="w-40 shrink-0">By</ColHead>
              <ColHead className="w-40 shrink-0 text-right">When</ColHead>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Nothing recorded"
                description="Scans and stock changes land here as they happen."
              />
            ) : (
              filtered.map((log) => (
                <div key={log.id} className="row-line flex items-center gap-4 px-5 py-3">
                  <span className="mono min-w-0 flex-1 truncate text-sm">{log.barcode}</span>
                  <span className="mono w-28 shrink-0 truncate text-[11px] uppercase tracking-[0.16em] text-[var(--brand-2)]">
                    {log.action}
                  </span>
                  <span className="hidden w-40 shrink-0 truncate text-sm text-muted-foreground md:block">
                    {log.scannedBy || "unknown"}
                    {log.result ? ` · ${log.result}` : ""}
                  </span>
                  <span className="mono hidden w-40 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
                    {formatDateTime(log.createdAt as string)}
                  </span>
                </div>
              ))
            )}
          </Panel>
        </div>
      </PageShell>
    </AdminGuard>
  );
}
