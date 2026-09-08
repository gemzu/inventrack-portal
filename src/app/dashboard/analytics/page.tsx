"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Rule, Figure, CrateSkeleton } from "@/components/console/surfaces";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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
      <PageShell title="Platform" eyebrow="Console">
        <EmptyState
          icon={ShieldAlert}
          title="Not yours to see"
          description="Platform analytics is superadmin only."
        />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Platform" subtitle="Reading every floor." eyebrow="Console">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-background p-5">
                <CrateSkeleton className="h-8 w-24 border-0" delay={i * 0.07} />
                <CrateSkeleton className="mt-3 h-2.5 w-16 border-0" delay={i * 0.07 + 0.04} />
              </div>
            ))}
          </div>
          <CrateSkeleton className="h-72 w-full" delay={0.3} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Platform"
      eyebrow="Console"
      subtitle="Across every organization on this deployment."
    >
      <div className="space-y-12">
        <section className="space-y-5">
          <Rule label="Totals" />
          <div className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
            {[
              { label: "Organizations", value: totalOrgs },
              { label: "People", value: totalUsers },
              { label: "Units tracked", value: totalItems },
              { label: "Orders placed", value: totalOrders },
            ].map((k) => (
              <div key={k.label} className="bg-background p-5">
                <Figure label={k.label} value={k.value} />
              </div>
            ))}
          </div>
        </section>

        {/* The chart keeps recharts, but drawn in the brand rather than in a
            default blue that appears nowhere else in the product. */}
        <section className="space-y-5">
          <Rule label="Signups, last 30 days" />
          <Panel className="reveal p-6">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={growthData}>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="color-mix(in oklab, var(--foreground) 10%, transparent)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)" }}
                    interval={Math.floor(growthData.length / 8)}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--brand-2) 8%, transparent)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--brand-2)"
                    radius={[2, 2, 0, 0]}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-20 text-center text-sm text-muted-foreground">
                Nobody signed up in the last 30 days.
              </p>
            )}
          </Panel>
        </section>

        <section className="space-y-5">
          <Rule label="Biggest floors" />
          <Panel className="reveal">
            {topOrgs.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No organizations yet.</p>
            ) : (
              topOrgs.map((org, i) => (
                <div key={org.id} className="row-line flex items-center gap-4 px-5 py-3">
                  <span className="mono w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{org.name}</span>
                  <span className="mono shrink-0 text-sm font-semibold tabular-nums">
                    {org.itemCount}
                  </span>
                  <span className="mono hidden w-28 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </Panel>
        </section>

        <section className="space-y-5">
          <Rule label="Active, last 7 days" />
          <Panel className="reveal">
            {activeUsers.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                Nobody has scanned anything this week.
              </p>
            ) : (
              activeUsers.map((u) => (
                <div key={u.email} className="row-line flex items-center gap-4 px-5 py-3">
                  <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <span className="mono shrink-0 text-[11px] text-muted-foreground">
                    {new Date(u.lastScan).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </Panel>
        </section>
      </div>
    </PageShell>
  );
}
