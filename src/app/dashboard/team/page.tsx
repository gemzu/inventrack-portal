"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users, Clock, TrendingUp, Monitor, RefreshCw, Loader2 } from "lucide-react";

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
  admin: "bg-red-500/10 text-red-500",
  worker: "bg-blue-500/10 text-blue-500",
  buyer: "bg-purple-500/10 text-purple-500",
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Activity</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Live team status & shift tracking
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/5"
            style={{ border: "1px solid var(--border)" }}
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Now", value: activeCount, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
            { label: "Total Hours Today", value: formatDuration(totalMinutes), icon: Clock, color: "text-primary", bg: "bg-primary/10" },
            { label: "Avg Shift", value: formatDuration(avgDuration), icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  {stat.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Currently Active */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <Users className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold">Currently Active</h2>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
              {activeUsers.length}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activeUsers.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {activeUsers.map((u) => (
                <div key={u.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
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
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}>
                          <Monitor className="w-3 h-3" />
                          {u.currentScreen}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {relativeTime(u.lastActiveAt)}
                      </span>
                    </div>
                  </div>
                  {u.isClockedIn && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-500">
                      Clocked in
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10">
              <Users className="w-8 h-8 mb-2" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted)" }}>No active users right now</p>
            </div>
          )}
        </div>

        {/* Today's Shifts */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>User</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Clock In</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Clock Out</th>
                    <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {todayShifts.map((shift) => (
                    <tr key={shift.id}>
                      <td className="px-5 py-3">
                        <div className="font-medium">{shift.userName || "Unknown"}</div>
                        {shift.userEmail && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{shift.userEmail}</div>
                        )}
                      </td>
                      <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{formatTime(shift.clockIn)}</td>
                      <td className="px-5 py-3">
                        {shift.clockOut ? (
                          <span style={{ color: "var(--muted)" }}>{formatTime(shift.clockOut)}</span>
                        ) : (
                          <span className="text-green-500 font-medium">Still active</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {shift.durationMinutes ? (
                          <span className="text-primary">{formatDuration(shift.durationMinutes)}</span>
                        ) : (
                          <span className="text-green-500">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-10">
              <Clock className="w-8 h-8 mb-2" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted)" }}>No shifts recorded today</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
