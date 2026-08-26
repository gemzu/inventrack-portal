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
import { Stagger, StaggerItem, MotionCard, AnimatedNumber, Reveal } from "@/components/motion/primitives";
import InventoryDonut from "@/components/dashboard/InventoryDonut";
import { PieChart as PieIcon } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-500/12 text-amber-600 border-amber-500/25 dark:text-amber-400",
  confirmed: "bg-primary/12 text-primary border-primary/25",
  processing: "bg-primary/12 text-primary border-primary/25",
  shipped: "bg-violet-500/12 text-violet-600 border-violet-500/25 dark:text-violet-400",
  delivered: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground border-border",
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  accent?: boolean;
  href?: string;
}

function StatCard({ label, value, icon: Icon, suffix, accent, href }: StatCardProps) {
  const inner = (
    <MotionCard className="p-5 group overflow-hidden h-full" glow={accent}>
      {accent && (
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl pointer-events-none" />
      )}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-display font-bold mt-2 tracking-tight">
            <AnimatedNumber value={value} />
            {suffix}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
          accent ? "bg-brand-gradient text-white shadow-[0_6px_16px_-6px_var(--brand-1)]" : "bg-secondary text-foreground"
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </MotionCard>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

function QuickAction({ icon: Icon, title, description, href }: { icon: React.ElementType; title: string; description: string; href: string }) {
  return (
    <StaggerItem>
      <Link href={href} className="block">
        <MotionCard className="p-5 flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-brand-gradient group-hover:text-white group-hover:scale-110">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        </MotionCard>
      </Link>
    </StaggerItem>
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
        const lowStock = items.filter((d) => (d.quantity || 0) <= 2 && d.status === "available").length;

        const countBy = (s: string) => items.filter((d) => d.status === s).length;
        setStatusData([
          { name: "Available", value: countBy("available") },
          { name: "Reserved", value: countBy("reserved") },
          { name: "Sold", value: countBy("sold") },
        ].filter((d) => d.value > 0));

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

  const kpis: StatCardProps[] = [
    { label: "Total Items", value: stats.items, icon: Package, accent: true, href: "/dashboard/inventory" },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, href: "/dashboard/inventory" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, href: "/dashboard/orders" },
    { label: "Users", value: stats.users, icon: UsersIcon, href: "/dashboard/users" },
    { label: "Pending", value: stats.pendingApprovals, icon: Clock, href: "/dashboard/approvals" },
    { label: "Fulfillment", value: stats.fulfillmentRate, suffix: "%", icon: TrendingUp, href: "/dashboard/reports" },
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
            <div className="w-20 h-20 rounded-2xl bg-brand-gradient mx-auto mb-6 flex items-center justify-center text-white shadow-glow">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Welcome to Invems</h2>
            <p className="text-muted-foreground mt-2">
              You&apos;re not part of an organization yet.
            </p>
            {userRole === "admin" ? (
              <Link href="/setup/organization">
                <button className="mt-6 px-6 py-3 rounded-xl bg-brand-gradient text-white font-semibold hover:brightness-110 transition shadow-[0_8px_24px_-8px_var(--brand-1)]">
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
          <Reveal>
            <MotionCard interactive={false} className={`p-4 flex items-center gap-4 ${announcement.type === "warning" ? "border-amber-400/40" : ""}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 ${announcement.type === "warning" ? "text-amber-500" : "text-primary"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{announcement.title}</p>
                <p className="text-sm text-muted-foreground truncate">{announcement.message}</p>
              </div>
              <button onClick={dismissAnnouncement} className="text-muted-foreground hover:text-foreground text-lg leading-none">
                <span className="sr-only">Dismiss</span>
                &times;
              </button>
            </MotionCard>
          </Reveal>
        )}

        {/* Stats Grid */}
        <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <StaggerItem key={kpi.label}>
              <StatCard {...kpi} />
            </StaggerItem>
          ))}
        </Stagger>

        {/* Quick Actions */}
        <Stagger className="grid sm:grid-cols-3 gap-4" delay={0.15}>
          <QuickAction icon={Upload} title="Import Inventory" description="Upload CSV to add items" href="/dashboard/inventory" />
          <QuickAction icon={UserPlus} title="Invite Team" description="Add workers or buyers" href="/dashboard/users" />
          <QuickAction icon={ShoppingCart} title="View Orders" description="Manage incoming orders" href="/dashboard/orders" />
        </Stagger>

        {/* Team Overview */}
        <Reveal delay={0.05}>
          <MotionCard interactive={false} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Team Overview</h3>
              </div>
              <Link href="/dashboard/users" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                Manage <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center gap-8 flex-wrap">
              <div>
                <p className="text-3xl font-display font-bold"><AnimatedNumber value={stats.users} /></p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary">{teamBreakdown.admins} admin{teamBreakdown.admins !== 1 ? "s" : ""}</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary">{teamBreakdown.workers} worker{teamBreakdown.workers !== 1 ? "s" : ""}</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary">{teamBreakdown.buyers} buyer{teamBreakdown.buyers !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                <span className="text-sm text-muted-foreground">{teamBreakdown.active} active</span>
              </div>
            </div>
          </MotionCard>
        </Reveal>

        {/* Inventory status breakdown */}
        <Reveal delay={0.05}>
          <MotionCard interactive={false} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <PieIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Inventory Status</h3>
            </div>
            <InventoryDonut data={statusData} />
          </MotionCard>
        </Reveal>

        {/* Facilities */}
        {facilities && facilities.length > 0 && (
          <Reveal delay={0.05}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Facilities</h3>
            </div>
            <Stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {facilities.map((fac) => (
                <StaggerItem key={fac.id}>
                  <MotionCard className="p-4">
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
                  </MotionCard>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        )}

        {/* Recent Orders & Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Reveal delay={0.05}>
            <MotionCard interactive={false} className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Recent Orders</h3>
                </div>
                <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {recentOrders.length > 0 ? (
                <div className="space-y-1">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
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
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${STATUS_STYLES[order.status] || STATUS_STYLES.pending_approval}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{formatDateTime(order.createdAt as string)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No orders yet</p>
              )}
            </MotionCard>
          </Reveal>

          <Reveal delay={0.1}>
            <MotionCard interactive={false} className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <Link href="/dashboard/activity" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {recentLogs.length > 0 ? (
                <div className="space-y-1">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                      <div>
                        <span className="text-sm mono">{log.barcode}</span>
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
            </MotionCard>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}
