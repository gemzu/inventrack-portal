"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp, Users as UsersIcon, Package, ShoppingCart,
  Building2, Activity, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { SkeletonCard, SkeletonChart } from "@/components/Skeleton";

export default function PlatformAnalyticsPage() {
  const { userPermissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalOrgs, setTotalOrgs] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [growthData, setGrowthData] = useState<{ date: string; count: number }[]>([]);
  const [topOrgs, setTopOrgs] = useState<{ id: string; name: string; itemCount: number; createdAt: string }[]>([]);
  const [activeUsers, setActiveUsers] = useState<{ email: string; name: string; lastScan: string }[]>([]);

  useEffect(() => {
    if (userPermissions !== "superadmin") {
      setLoading(false);
      return;
    }
    loadAnalytics();
  }, [userPermissions]);

  async function loadAnalytics() {
    try {
      // Platform-wide counts (no org_id filter)
      const [orgRes, userRes, itemRes, orderRes] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("inventory").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
      ]);
      setTotalOrgs(orgRes.count || 0);
      setTotalUsers(userRes.count || 0);
      setTotalItems(itemRes.count || 0);
      setTotalOrders(orderRes.count || 0);

      // Growth chart: users created in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentUsers } = await supabase
        .from("users")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo);

      if (recentUsers) {
        const byDay: Record<string, number> = {};
        for (const u of recentUsers) {
          const day = new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          byDay[day] = (byDay[day] || 0) + 1;
        }
        // Build full 30-day range
        const chartData: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          chartData.push({ date: label, count: byDay[label] || 0 });
        }
        setGrowthData(chartData);
      }

      // Top organizations by inventory count
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, created_at");

      if (orgs && orgs.length > 0) {
        const orgItems: { id: string; name: string; itemCount: number; createdAt: string }[] = [];
        for (const org of orgs) {
          const { count } = await supabase
            .from("inventory")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);
          orgItems.push({
            id: org.id,
            name: org.name || "Unnamed",
            itemCount: count || 0,
            createdAt: org.created_at,
          });
        }
        orgItems.sort((a, b) => b.itemCount - a.itemCount);
        setTopOrgs(orgItems.slice(0, 10));
      }

      // Active users: scanned in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentScans } = await supabase
        .from("scan_logs")
        .select("scanned_by, created_at")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200);

      if (recentScans) {
        const userMap = new Map<string, string>();
        for (const scan of recentScans) {
          if (scan.scanned_by && !userMap.has(scan.scanned_by)) {
            userMap.set(scan.scanned_by, scan.created_at);
          }
        }
        const activeList = Array.from(userMap.entries()).map(([email, lastScan]) => ({
          email,
          name: email.split("@")[0],
          lastScan,
        }));
        setActiveUsers(activeList.slice(0, 20));
      }
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (userPermissions !== "superadmin" && !loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
            <TrendingUp className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Platform Analytics is only available to superadmins.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 rounded-lg animate-pulse" style={{ background: "var(--border)" }} />
          <div className="h-4 w-80 rounded-lg animate-pulse mt-2" style={{ background: "var(--border)" }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  const kpis = [
    { label: "Total Orgs", value: totalOrgs, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Users", value: totalUsers, icon: UsersIcon, color: "text-success", bg: "bg-success/10" },
    { label: "Total Items", value: totalItems, icon: Package, color: "text-accent", bg: "bg-accent/10" },
    { label: "Total Orders", value: totalOrders, icon: ShoppingCart, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Cross-organization metrics and growth insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <TrendingUp className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Growth Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">User Growth (Last 30 Days)</h3>
        </div>
        {growthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                fontSize={10}
                tick={{ fill: "var(--muted)" }}
                interval={Math.floor(growthData.length / 8)}
              />
              <YAxis fontSize={12} tick={{ fill: "var(--muted)" }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
            No signup data in the last 30 days
          </div>
        )}
      </div>

      {/* Top Organizations */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Top Organizations by Inventory</h3>
        </div>
        {topOrgs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="text-left py-2 font-semibold" style={{ color: "var(--muted)" }}>#</th>
                  <th className="text-left py-2 font-semibold" style={{ color: "var(--muted)" }}>Organization</th>
                  <th className="text-right py-2 font-semibold" style={{ color: "var(--muted)" }}>Items</th>
                  <th className="text-right py-2 font-semibold" style={{ color: "var(--muted)" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {topOrgs.map((org, i) => (
                  <tr key={org.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2.5 font-medium" style={{ color: "var(--muted)" }}>{i + 1}</td>
                    <td className="py-2.5 font-semibold">{org.name}</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {org.itemCount}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No organizations found</p>
        )}
      </div>

      {/* Active Users */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Active Users (Last 7 Days)</h3>
        </div>
        {activeUsers.length > 0 ? (
          <div className="space-y-3">
            {activeUsers.map((u) => (
              <div
                key={u.email}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <UsersIcon className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(u.lastScan).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No active users in the last 7 days</p>
        )}
      </div>
    </div>
  );
}
