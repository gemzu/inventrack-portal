"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Package, ShoppingCart, Users as UsersIcon, AlertTriangle, TrendingUp, Activity,
  Upload, UserPlus, ArrowRight, MapPin, Clock,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { SkeletonCard, SkeletonChart } from "@/components/Skeleton";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#16a34a", "#d97706", "#2563eb", "#dc2626"];

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/10 text-amber-500",
  approved:  "bg-blue-500/10 text-blue-500",
  fulfilled: "bg-green-500/10 text-green-500",
  rejected:  "bg-red-500/10 text-red-500",
  cancelled: "bg-gray-500/10 text-gray-400",
};

export default function DashboardPage() {
  const { orgId, orgData, facilities } = useAuth();
  const [stats, setStats] = useState({ items: 0, lowStock: 0, orders: 0, users: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ id: string; barcode: string; action: string; scannedBy: string; createdAt: unknown }[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamBreakdown, setTeamBreakdown] = useState({ admins: 0, workers: 0, buyers: 0, active: 0 });
  const [recentOrders, setRecentOrders] = useState<{ id: string; buyerName: string; itemCount: number; status: string; createdAt: unknown }[]>([]);
  const [facilityItems, setFacilityItems] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState<{ id: string; title: string; message: string; type: string } | null>(null);

  useEffect(() => {
    // Fetch announcement (no org_id needed)
    const loadAnnouncement = async () => {
      try {
        const dismissed = typeof window !== "undefined" ? localStorage.getItem("dismissed_announcement") : null;
        const { data } = await supabase
          .from("announcements")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0 && dismissed !== data[0].id) {
          setAnnouncement(data[0]);
        }
      } catch (_) {}
    };
    loadAnnouncement();
  }, []);

  const dismissAnnouncement = () => {
    if (announcement) {
      localStorage.setItem("dismissed_announcement", announcement.id);
      setAnnouncement(null);
    }
  };

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data: invData } = await supabase.from("inventory").select("*").eq("org_id", orgId);
        const items = invData || [];
        const available = items.filter((d) => d.status === "available").length;
        const reserved = items.filter((d) => d.status === "reserved").length;
        const sold = items.filter((d) => d.status === "sold").length;
        const lowStock = items.filter((d) => (d.quantity || 0) <= 2 && d.status === "available").length;

        const { count: ordCount } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("org_id", orgId);
        const { data: usrData } = await supabase.from("users").select("*").eq("org_id", orgId);
        const usrDocs = usrData || [];

        // Team breakdown
        const admins = usrDocs.filter((u) => u.role === "admin").length;
        const workers = usrDocs.filter((u) => u.role === "worker").length;
        const buyers = usrDocs.filter((u) => u.role === "buyer").length;
        const active = usrDocs.filter((u) => u.active === true).length;
        setTeamBreakdown({ admins, workers, buyers, active });

        setStats({
          items: items.length,
          lowStock,
          orders: ordCount || 0,
          users: usrDocs.length,
        });

        setStatusData([
          { name: "Available", value: available },
          { name: "Reserved", value: reserved },
          { name: "Sold", value: sold },
        ].filter((d) => d.value > 0));

        // Recent orders
        try {
          const { data: recentOrdData } = await supabase
            .from("orders")
            .select("*")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(5);

          setRecentOrders(
            (recentOrdData || []).map((d) => ({
              id: d.id,
              buyerName: d.buyer_name || d.buyer_email || "Unknown",
              itemCount: Array.isArray(d.items) ? d.items.length : (d.item_count || 0),
              status: d.status || "pending",
              createdAt: d.created_at,
            }))
          );
        } catch (ordErr) {
          console.error("Recent orders load error:", ordErr);
        }

        // Facility item counts
        if (facilities && facilities.length > 0) {
          try {
            const facCounts: Record<string, number> = {};
            for (const fac of facilities) {
              const count = items.filter((d) => d.facility_id === fac.id).length;
              facCounts[fac.id] = count;
            }
            setFacilityItems(facCounts);
          } catch {
            // Ignore facility count errors
          }
        }

        const { data: logData } = await supabase
          .from("scan_logs")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(10);

        setRecentLogs(
          (logData || []).map((d) => ({
            id: d.id,
            barcode: d.barcode,
            action: d.action,
            scannedBy: d.scanned_by,
            createdAt: d.created_at,
          }))
        );
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId, facilities]);

  const kpis = [
    { label: "Total Items", value: stats.items, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "text-accent", bg: "bg-accent/10" },
    { label: "Users", value: stats.users, icon: UsersIcon, color: "text-success", bg: "bg-success/10" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 rounded-lg animate-pulse" style={{ background: "var(--border)" }} />
          <div className="h-4 w-64 rounded-lg animate-pulse mt-2" style={{ background: "var(--border)" }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-5">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Welcome to INVENTRACK</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            You&apos;re not part of an organization yet. Download the mobile app and join or create an organization to get started.
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Use the INVENTRACK mobile app to create or join an organization
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Overview of your warehouse operations</p>
      </div>

      {/* Announcement Banner */}
      {announcement && (
        <div
          className="glass-card p-4 flex items-start gap-3"
          style={{
            background: announcement.type === "warning"
              ? "rgba(217,119,6,0.08)"
              : announcement.type === "success"
              ? "rgba(22,163,74,0.08)"
              : "rgba(37,99,235,0.08)",
            borderColor: announcement.type === "warning"
              ? "rgba(217,119,6,0.2)"
              : announcement.type === "success"
              ? "rgba(22,163,74,0.2)"
              : "rgba(37,99,235,0.2)",
          }}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              announcement.type === "warning" ? "bg-amber-500/10" : announcement.type === "success" ? "bg-green-500/10" : "bg-blue-500/10"
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 ${
                announcement.type === "warning" ? "text-amber-500" : announcement.type === "success" ? "text-green-500" : "text-blue-500"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-bold ${
                announcement.type === "warning" ? "text-amber-500" : announcement.type === "success" ? "text-green-500" : "text-blue-500"
              }`}
            >
              {announcement.title}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {announcement.message}
            </p>
          </div>
          <button
            onClick={dismissAnnouncement}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
          >
            <span className="text-xs" style={{ color: "var(--muted)" }}>&#10005;</span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-5 hover-lift">
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

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Upload, title: "Import Inventory", desc: "Upload CSV to add items in bulk", href: "/dashboard/inventory" },
          { icon: UserPlus, title: "Invite Team", desc: "Add workers, admins, or buyers", href: "/dashboard/users" },
          { icon: ShoppingCart, title: "View Orders", desc: "Review and manage incoming orders", href: "/dashboard/orders" },
        ].map((action) => (
          <Link key={action.title} href={action.href} className="glass-card p-5 hover-lift flex items-center gap-4 group hover:scale-[1.02] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <action.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{action.title}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{action.desc}</div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" style={{ color: "var(--muted)" }} />
          </Link>
        ))}
      </div>

      {/* Team Overview */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Team Overview</h3>
          </div>
          <Link href="/dashboard/users" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            Manage Team <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-3xl font-bold">{stats.users}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Total Members</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">
              {teamBreakdown.admins} admin{teamBreakdown.admins !== 1 ? "s" : ""}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
              {teamBreakdown.workers} worker{teamBreakdown.workers !== 1 ? "s" : ""}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500">
              {teamBreakdown.buyers} buyer{teamBreakdown.buyers !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              {teamBreakdown.active} active
            </span>
          </div>
        </div>
      </div>

      {/* Facility Overview */}
      {facilities && facilities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Facilities</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="glass-card p-4 shrink-0"
                style={{ minWidth: 180, maxWidth: 220 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{fac.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{fac.state}</div>
                  </div>
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {facilityItems[fac.id] ?? 0} item{(facilityItems[fac.id] ?? 0) !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Inventory by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
              No inventory data yet
            </div>
          )}
        </div>

        {/* Quick Stats Bar */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Summary</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kpis.map((k) => ({ name: k.label, value: k.value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: "var(--muted)" }} />
              <YAxis fontSize={12} tick={{ fill: "var(--muted)" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Recent Orders</h3>
          </div>
          <Link href="/dashboard/orders" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            View All Orders <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{order.buyerName}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLES[order.status] || "bg-gray-500/10 text-gray-400"}`}>
                    {order.status}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatDateTime(order.createdAt as string)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No orders yet</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        {recentLogs.length > 0 ? (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <div>
                  <span className="text-sm font-medium">{log.barcode}</span>
                  <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary">{log.action}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{log.scannedBy}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDateTime(log.createdAt as string)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No recent activity</p>
        )}
      </div>
    </div>
  );
}
