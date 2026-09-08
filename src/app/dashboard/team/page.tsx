"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users, Clock, TrendingUp, Monitor, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/page-shell";

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  role: string;
  currentScreen: string | null;
  lastActiveAt: string | null;
  isClockedIn: boolean;
}

interface Shift {
  id: string;
  userName: string | null;
  userEmail: string | null;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  facilityId: string | null;
}

function mapUser(row: Record<string, unknown>): ActiveUser {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    email: (row.email as string) || "",
    role: (row.role as string) || "worker",
    currentScreen: row.current_screen as string | null,
    lastActiveAt: row.last_active_at as string | null,
    isClockedIn: (row.is_clocked_in as boolean) || false,
  };
}

function mapShift(row: Record<string, unknown>): Shift {
  return {
    id: row.id as string,
    userName: row.user_name as string | null,
    userEmail: row.user_email as string | null,
    clockIn: row.clock_in as string,
    clockOut: row.clock_out as string | null,
    durationMinutes: row.duration_minutes as number | null,
    facilityId: row.facility_id as string | null,
  };
}

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "";
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Active now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDuration(minutes: number | null) {
  if (!minutes && minutes !== 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  worker: "bg-primary/10 text-primary",
  buyer: "bg-primary/10 text-primary",
};

export default function TeamPage() {
  const { orgId } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [usersRes, shiftsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, role, current_screen, last_active_at, is_clocked_in")
        .eq("org_id", orgId)
        .gte("last_active_at", fiveMinAgo),
      supabase
        .from("shifts")
        .select("*")
        .eq("org_id", orgId)
        .order("clock_in", { ascending: false })
        .limit(50),
    ]);

    setActiveUsers((usersRes.data || []).map(mapUser));
    setShifts((shiftsRes.data || []).map(mapShift));
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  // Filter to today's shifts
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayShifts = shifts.filter((s) => new Date(s.clockIn) >= todayStart);

  // Summary
  const totalMinutes = todayShifts.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const activeCount = activeUsers.filter((u) => u.isClockedIn).length;
  const completedShifts = todayShifts.filter((s) => s.durationMinutes);
  const avgDuration = completedShifts.length > 0 ? Math.round(totalMinutes / completedShifts.length) : 0;

  return (
    <AdminGuard>
      <PageShell
        title="Team Activity"
        subtitle="Live team status & shift tracking"
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="h-10">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        }
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Now", value: activeCount, icon: Users, color: "text-success", bg: "bg-success/10" },
            { label: "Total Hours Today", value: formatDuration(totalMinutes), icon: Clock, color: "text-primary", bg: "bg-primary/10" },
            { label: "Avg Shift", value: formatDuration(avgDuration), icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
          ].map((stat) => (
            <Card key={stat.label}><CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Currently Active */}
        <Card className="rounded-2xl overflow-hidden"><CardContent className="p-0">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-border">
            <Users className="w-4 h-4 text-success" />
            <h2 className="font-semibold">Currently Active</h2>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
              {activeUsers.length}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activeUsers.length > 0 ? (
            <div className="divide-y">
              {activeUsers.map((u) => (
                <div key={u.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{u.name || u.email}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[u.role] || "bg-gray-500/10 text-gray-500"}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {u.currentScreen && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Monitor className="w-3 h-3" />
                          {u.currentScreen}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(u.lastActiveAt)}
                      </span>
                    </div>
                  </div>
                  {u.isClockedIn && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-success/10 text-success">
                      Clocked in
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10">
              <Users className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No active users right now</p>
            </div>
          )}
        </CardContent></Card>

        {/* Today's Shifts */}
        <Card className="rounded-2xl overflow-hidden"><CardContent className="p-0">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-border">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Today&apos;s Shifts</h2>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {todayShifts.length}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : todayShifts.length > 0 ? (
            <div>
              {todayShifts.map((shift) => (
                <div key={shift.id} className="flex items-center gap-4 px-5 py-3 border-b border-border/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{shift.userName || "Unknown"}</div>
                    {shift.userEmail && <div className="text-xs text-muted-foreground truncate">{shift.userEmail}</div>}
                  </div>
                  <div className="text-sm text-muted-foreground shrink-0 hidden sm:block whitespace-nowrap">
                    {formatTime(shift.clockIn)}
                    {" → "}
                    {shift.clockOut ? formatTime(shift.clockOut) : <span className="text-success font-medium">now</span>}
                  </div>
                  <div className="text-sm font-semibold shrink-0 w-16 text-right">
                    {shift.durationMinutes ? (
                      <span className="text-primary">{formatDuration(shift.durationMinutes)}</span>
                    ) : (
                      <span className="text-success">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10">
              <Clock className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No shifts recorded today</p>
            </div>
          )}
        </CardContent></Card>
      </PageShell>
    </AdminGuard>
  );
}
