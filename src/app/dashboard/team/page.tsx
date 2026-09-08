"use client";
import AdminGuard from "@/components/AdminGuard";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users, Clock, RefreshCw } from "lucide-react";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Rule, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action } from "@/components/console/controls";

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
        title="Team"
        eyebrow="Console"
        subtitle="Who is on the floor right now, and what today's shifts add up to."
        actions={
          <Action onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Action>
        }
      >
        <div className="space-y-12">
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure
              label="On the floor"
              value={activeCount}
              tone={activeCount ? "brand" : undefined}
            />
            <Figure label="Hours today" value={formatDuration(totalMinutes)} />
            <Figure label="Average shift" value={formatDuration(avgDuration)} />
          </div>

          {/* ── Active ─────────────────────────────────────────── */}
          <section className="space-y-5">
            <Rule
              label="Active now"
              action={
                <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {activeUsers.length}
                </span>
              }
            />
            {loading ? (
              <ListSkeleton rows={3} />
            ) : activeUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody signed in"
                description="People show up here while they are using the app or the portal."
              />
            ) : (
              <Panel className="reveal">
                {activeUsers.map((u) => (
                  <div key={u.id} className="row-line flex items-center gap-4 px-5 py-3.5">
                    {/* One dot for presence. The role and the screen are words. */}
                    <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name || u.email}</p>
                      <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {u.role}
                        {u.currentScreen ? ` · ${u.currentScreen}` : ""}
                        {` · ${relativeTime(u.lastActiveAt)}`}
                      </p>
                    </div>
                    {u.isClockedIn && (
                      <span className="mono shrink-0 text-[11px] uppercase tracking-[0.16em] text-success">
                        Clocked in
                      </span>
                    )}
                  </div>
                ))}
              </Panel>
            )}
          </section>

          {/* ── Shifts ─────────────────────────────────────────── */}
          <section className="space-y-5">
            <Rule
              label="Today's shifts"
              action={
                <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {todayShifts.length}
                </span>
              }
            />
            {loading ? (
              <ListSkeleton rows={4} />
            ) : todayShifts.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No shifts today"
                description="Clock-ins from the app land here as they happen."
              />
            ) : (
              <Panel className="reveal">
                <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                  <ColHead className="min-w-0 flex-1">Person</ColHead>
                  <ColHead className="w-44 shrink-0">In and out</ColHead>
                  <ColHead className="w-20 shrink-0 text-right">Length</ColHead>
                </div>
                {todayShifts.map((shift) => (
                  <div key={shift.id} className="row-line flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{shift.userName || "Unknown"}</p>
                      {shift.userEmail && (
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {shift.userEmail}
                        </p>
                      )}
                    </div>
                    <span className="mono hidden w-44 shrink-0 text-[11px] text-muted-foreground sm:block">
                      {formatTime(shift.clockIn)} → {shift.clockOut ? formatTime(shift.clockOut) : "now"}
                    </span>
                    <span
                      className={`mono w-20 shrink-0 text-right text-sm font-semibold tabular-nums ${
                        shift.durationMinutes ? "" : "text-success"
                      }`}
                    >
                      {shift.durationMinutes ? formatDuration(shift.durationMinutes) : "Open"}
                    </span>
                  </div>
                ))}
              </Panel>
            )}
          </section>
        </div>
      </PageShell>
    </AdminGuard>
  );
}
