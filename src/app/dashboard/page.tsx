"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Package, ShoppingCart, Users as UsersIcon, AlertTriangle, TrendingUp, Activity,
  Upload, UserPlus, ArrowRight, MapPin, Clock,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { normalizeOrderStatus } from "@/lib/orderStatus";
import { SkeletonCard, SkeletonChart } from "@/components/Skeleton";
import Link from "next/link";
import PageShell from "@/components/page-shell";

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-gray-50 text-gray-700 border-gray-200",
  processing: "bg-gray-50 text-gray-700 border-gray-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-gray-50 text-gray-400 border-gray-200",
};

const STATUS_STYLES_DARK: Record<string, string> = {
  pending_approval: "bg-amber-950/50 text-amber-400 border-amber-800",
  confirmed: "bg-gray-800/50 text-gray-400 border-gray-700",
  processing: "bg-gray-800/50 text-gray-400 border-gray-700",
  shipped: "bg-purple-950/50 text-purple-400 border-purple-800",
  delivered: "bg-green-950/50 text-green-400 border-green-800",
  cancelled: "bg-gray-800/50 text-gray-500 border-gray-700",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  delay?: number;
}

function StatCard({ label, value, icon: Icon, trend, delay = 0 }: StatCardProps) {
  return (
    <div 
      className="card-luxury p-6 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold mt-2 tracking-tight">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, href, delay = 0 }: { icon: React.ElementType; title: string; description: string; href: string; delay?: number }) {
  return (
    <Link 
      href={href} 
      className="card-luxury p-5 flex items-center gap-4 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
    </Link>
  );
}

export default function DashboardPage() {
  const { orgId, userRole, facilities } = useAuth();
  const [stats, setStats] = useState({ items: 0, lowStock: 0, orders: 0, users: 0, pendingApprovals: 0, fulfillmentRate: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ id: string; barcode: string; action: string; scannedBy: string; createdAt: unknown }[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamBreakdown, setTeamBreakdown] = useState({ admins: 0, workers: 0, buyers: 0, active: 0 });
  const [recentOrders, setRecentOrders] = useState<{ id: string; buyerName: string; itemCount: number; status: string; createdAt: unknown }[]>([]);
  const [facilityItems, setFacilityItems] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState<{ id: string; title: string; message: string; type: string } | null>(null);

  useEffect(() => {
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
      } catch {}
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
        const { data: ordMetrics } = await supabase.from("orders").select("status").eq("org_id", orgId);
        const normalizedOrderStatuses = (ordMetrics || []).map((o) => normalizeOrderStatus(o.status));
        const deliveredOrders = normalizedOrderStatuses.filter((s) => s === "delivered").length;
        const fulfillmentRate = normalizedOrderStatuses.length > 0 ? Math.round((deliveredOrders / normalizedOrderStatuses.length) * 100) : 0;
        const { count: pendingApprovals } = await supabase
          .from("approvals")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "pending");
        const { data: usrData } = await supabase.from("users").select("*").eq("org_id", orgId);
        const usrDocs = usrData || [];

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
          pendingApprovals: pendingApprovals || 0,
          fulfillmentRate,
        });

        setStatusData([
          { name: "Available", value: available },
          { name: "Reserved", value: reserved },
          { name: "Sold", value: sold },
        ].filter((d) => d.value > 0));

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
              status: normalizeOrderStatus(d.status) || "pending_approval",
              createdAt: d.created_at,
            }))
          );
        } catch (ordErr) {
          console.error("Recent orders load error:", ordErr);
        }

        if (facilities && facilities.length > 0) {
          try {
            const facCounts: Record<string, number> = {};
            for (const fac of facilities) {
              const count = items.filter((d) => d.facility_id === fac.id).length;
              facCounts[fac.id] = count;
            }
            setFacilityItems(facCounts);
          } catch {}
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
    { label: "Total Items", value: stats.items, icon: Package },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle },
    { label: "Orders", value: stats.orders, icon: ShoppingCart },
    { label: "Users", value: stats.users, icon: UsersIcon },
    { label: "Pending", value: stats.pendingApprovals, icon: Clock },
    { label: "Fulfillment", value: `${stats.fulfillmentRate}%`, icon: TrendingUp },
  ];

  if (loading) {
    return (
      <PageShell title="Dashboard" subtitle="Overview of your operations">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!orgId) {
    return (
      <PageShell title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto mb-6 flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold">Welcome to Invems</h2>
            <p className="text-muted-foreground mt-2">
              You&apos;re not part of an organization yet.
            </p>
            {userRole === "admin" ? (
              <Link href="/setup/organization">
                <button className="mt-6 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity">
                  Create Organization
                </button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground mt-6">
                Ask your organization owner for an invite code.
              </p>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard" subtitle="Overview of your operations">
      <div className="space-y-8">
        {/* Announcement */}
        {announcement && (
          <div className={`card-luxury p-4 flex items-center gap-4 ${announcement.type === "warning" ? "border-amber-300" : ""}`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 ${announcement.type === "warning" ? "text-amber-500" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{announcement.title}</p>
              <p className="text-sm text-muted-foreground truncate">{announcement.message}</p>
            </div>
            <button onClick={dismissAnnouncement} className="text-muted-foreground hover:text-foreground">
              <span className="sr-only">Dismiss</span>
              &times;
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {kpis.map((kpi, idx) => (
            <StatCard key={kpi.label} {...kpi} delay={idx * 60} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 stagger-children">
          <QuickAction icon={Upload} title="Import Inventory" description="Upload CSV to add items" href="/dashboard/inventory" delay={360} />
          <QuickAction icon={UserPlus} title="Invite Team" description="Add workers or buyers" href="/dashboard/users" delay={420} />
          <QuickAction icon={ShoppingCart} title="View Orders" description="Manage incoming orders" href="/dashboard/orders" delay={480} />
        </div>

        {/* Team Overview */}
        <div className="card-luxury p-6 scale-in" style={{ animationDelay: "540ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-5 h-5" />
              <h3 className="font-semibold">Team Overview</h3>
            </div>
            <Link href="/dashboard/users" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-3xl font-semibold">{stats.users}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary">{teamBreakdown.admins} admin{teamBreakdown.admins !== 1 ? "s" : ""}</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary">{teamBreakdown.workers} worker{teamBreakdown.workers !== 1 ? "s" : ""}</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary">{teamBreakdown.buyers} buyer{teamBreakdown.buyers !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
              <span className="text-sm text-muted-foreground">{teamBreakdown.active} active</span>
            </div>
          </div>
        </div>

        {/* Facilities */}
        {facilities && facilities.length > 0 && (
          <div className="scale-in" style={{ animationDelay: "600ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              <h3 className="font-semibold">Facilities</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {facilities.map((fac) => (
                <div key={fac.id} className="card-luxury p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{fac.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{fac.state}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {facilityItems[fac.id] ?? 0} items
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders & Activity */}
        <div className="grid lg:grid-cols-2 gap-6 stagger-children">
          <div className="card-luxury p-6 scale-in" style={{ animationDelay: "660ms" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5" />
                <h3 className="font-semibold">Recent Orders</h3>
              </div>
              <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{order.buyerName}</p>
                        <p className="text-xs text-muted-foreground">{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${STATUS_STYLES[order.status] || STATUS_STYLES.pending_approval} dark:${STATUS_STYLES_DARK[order.status] || STATUS_STYLES_DARK.pending_approval}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(order.createdAt as string)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No orders yet</p>
            )}
          </div>

          <div className="card-luxury p-6 scale-in" style={{ animationDelay: "720ms" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5" />
                <h3 className="font-semibold">Recent Activity</h3>
              </div>
              <Link href="/dashboard/activity" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {recentLogs.length > 0 ? (
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <span className="text-sm font-mono">{log.barcode}</span>
                      <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-secondary">{log.action}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{log.scannedBy}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt as string)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
