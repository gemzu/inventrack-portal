"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FileBarChart, Package, ShoppingCart, Activity, Download,
  AlertTriangle, TrendingUp, Loader2, CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { normalizeOrderStatus, ORDER_STATUS } from "@/lib/orderStatus";
import { SkeletonCard } from "@/components/Skeleton";

function downloadCsv(filename: string, header: string, rows: string[][]) {
  const csvHeader = header;
  const csvRows = rows.map((r) =>
    r.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [csvHeader, ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState({
    totalItems: 0,
    available: 0,
    reserved: 0,
    sold: 0,
    ordersThisMonth: 0,
    ordersPending: 0,
    ordersFulfilled: 0,
    ordersRejected: 0,
    pendingApprovals: 0,
    fulfillmentRate: 0,
    lowStockItems: [] as { modelId: string; quantity: number; brand: string }[],
  });
  const [generating, setGenerating] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    try {
      // Inventory breakdown
      const { data: invData } = await supabase
        .from("inventory")
        .select("*")
        .eq("org_id", orgId);
      const items = invData || [];
      const available = items.filter((i) => i.status === "available").length;
      const reserved = items.filter((i) => i.status === "reserved").length;
      const sold = items.filter((i) => i.status === "sold").length;

      // Orders this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: ordData } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", orgId)
        .gte("created_at", monthStart.toISOString());
      const orders = ordData || [];
      const pending = orders.filter((o) => normalizeOrderStatus(o.status) === ORDER_STATUS.PENDING_APPROVAL).length;
      const fulfilled = orders.filter((o) => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED).length;
      const rejected = orders.filter((o) => normalizeOrderStatus(o.status) === ORDER_STATUS.CANCELLED).length;
      const fulfillmentRate = orders.length > 0 ? Math.round((fulfilled / orders.length) * 100) : 0;
      const { count: pendingApprovals } = await supabase
        .from("approvals")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "pending");

      // Low stock items
      const lowStock = items
        .filter((i) => (i.quantity || 0) <= 2 && i.status === "available")
        .map((i) => ({
          modelId: i.model_id || "",
          quantity: i.quantity || 0,
          brand: i.brand || "",
        }));

      setSnapshot({
        totalItems: items.length,
        available,
        reserved,
        sold,
        ordersThisMonth: orders.length,
        ordersPending: pending,
        ordersFulfilled: fulfilled,
        ordersRejected: rejected,
        pendingApprovals: pendingApprovals || 0,
        fulfillmentRate,
        lowStockItems: lowStock,
      });
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  async function generateReport(type: string) {
    if (!orgId) return;
    setGenerating(type);
    try {
      if (type === "inventory") {
        const { data } = await supabase.from("inventory").select("*").eq("org_id", orgId);
        const items = data || [];
        const header = "Model ID,Barcode,Brand,Part Number,Quantity,Status,Category,Type";
        const rows = items.map((i) => [
          i.model_id || "", i.barcode || "", i.brand || "", i.part_number || "",
          String(i.quantity || ""), i.status || "", i.category || "", i.type || "",
        ]);
        downloadCsv("inventory_report.csv", header, rows);
      } else if (type === "orders") {
        const { data } = await supabase.from("orders").select("*").eq("org_id", orgId);
        const items = data || [];
        const header = "ID,Buyer Name,Buyer Email,Status,Item Count,Created At";
        const rows = items.map((o) => [
          o.id || "", o.buyer_name || o.buyer_email || "", o.buyer_email || "",
          normalizeOrderStatus(o.status) || "", String(Array.isArray(o.items) ? o.items.length : (o.item_count || 0)),
          o.created_at || "",
        ]);
        downloadCsv("orders_report.csv", header, rows);
      } else if (type === "activity") {
        const { data } = await supabase
          .from("scan_logs")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1000);
        const items = data || [];
        const header = "Barcode,Action,Scanned By,Created At";
        const rows = items.map((s) => [
          s.barcode || "", s.action || "", s.scanned_by || "", s.created_at || "",
        ]);
        downloadCsv("activity_report.csv", header, rows);
      } else if (type === "low_stock") {
        const header = "Model ID,Brand,Quantity";
        const rows = snapshot.lowStockItems.map((i) => [i.modelId, i.brand, String(i.quantity)]);
        downloadCsv("low_stock_report.csv", header, rows);
      } else if (type === "ops_digest") {
        const header = "Metric,Value";
        const rows = [
          ["Total Inventory Items", String(snapshot.totalItems)],
          ["Available Items", String(snapshot.available)],
          ["Reserved Items", String(snapshot.reserved)],
          ["Sold Items", String(snapshot.sold)],
          ["Orders This Month", String(snapshot.ordersThisMonth)],
          ["Orders Pending Approval", String(snapshot.ordersPending)],
          ["Orders Delivered", String(snapshot.ordersFulfilled)],
          ["Orders Cancelled", String(snapshot.ordersRejected)],
          ["Pending Approvals Queue", String(snapshot.pendingApprovals)],
          ["Fulfillment Rate", `${snapshot.fulfillmentRate}%`],
          ["Low Stock Items", String(snapshot.lowStockItems.length)],
        ];
        downloadCsv("operations_digest.csv", header, rows);
      }
    } catch (err) {
      console.error("Report generation error:", err);
    } finally {
      setGenerating(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 rounded-lg animate-pulse bg-border" />
          <div className="h-4 w-64 rounded-lg animate-pulse mt-2 bg-border" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card><CardContent className="p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <FileBarChart className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Organization</h2>
          <p className="text-sm text-muted-foreground">
            Join an organization to access reports.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  const statCards = [
    { label: "Total Items", value: snapshot.totalItems, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Available", value: snapshot.available, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Reserved", value: snapshot.reserved, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Sold", value: snapshot.sold, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
  ];

  const reportCards = [
    {
      title: "Inventory Report",
      desc: "Full inventory with all fields exported as CSV",
      icon: Package,
      type: "inventory",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Orders Report",
      desc: "All orders with buyer info, status, and item counts",
      icon: ShoppingCart,
      type: "orders",
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Ops Digest",
      desc: "One-file KPI digest for owners and managers",
      icon: TrendingUp,
      type: "ops_digest",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Activity Report",
      desc: "Recent scan logs and barcode activity (up to 1000)",
      icon: Activity,
      type: "activity",
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate and download reports for your organization
        </p>
      </div>

      {/* Current Snapshot */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Current Snapshot</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label}><CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
          </CardContent></Card>
          ))}
        </div>
      </div>

      {/* Orders This Month */}
      <Card><CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Orders This Month</h3>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-3xl font-bold">{snapshot.ordersThisMonth}</div>
            <div className="text-xs text-muted-foreground">Total Orders</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500">
              {snapshot.ordersPending} pending
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
              {snapshot.ordersFulfilled} fulfilled
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500">
              {snapshot.ordersRejected} rejected
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">
              {snapshot.fulfillmentRate}% fulfillment
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500">
              {snapshot.pendingApprovals} approvals queued
            </span>
          </div>
        </div>
      </CardContent></Card>

      {/* Low Stock Items */}
      {snapshot.lowStockItems.length > 0 && (
        <Card><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="font-semibold">Low Stock Items ({snapshot.lowStockItems.length})</h3>
            </div>
            <button
              onClick={() => generateReport("low_stock")}
              disabled={generating === "low_stock"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:border-primary transition"
            >
              {generating === "low_stock" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              Download CSV
            </button>
          </div>
          <div className="space-y-2">
            {snapshot.lowStockItems.slice(0, 8).map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <span className="text-sm font-medium">{item.modelId}</span>
                  <span className="text-xs ml-2 text-muted-foreground">{item.brand}</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-warning/10 text-warning">
                  Qty: {item.quantity}
                </span>
              </div>
            ))}
            {snapshot.lowStockItems.length > 8 && (
              <p className="text-xs text-center pt-2 text-muted-foreground">
                +{snapshot.lowStockItems.length - 8} more items
              </p>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Quick Reports */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Quick Reports</h3>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          {reportCards.map((report) => (
            <Card key={report.type}><CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${report.bg} flex items-center justify-center mb-4`}>
                <report.icon className={`w-5 h-5 ${report.color}`} />
              </div>
              <h4 className="font-semibold text-sm mb-1">{report.title}</h4>
              <p className="text-xs mb-4 text-muted-foreground">
                {report.desc}
              </p>
              <button
                onClick={() => generateReport(report.type)}
                disabled={generating === report.type}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium w-full justify-center hover:border-primary transition"
              >
                {generating === report.type ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generating === report.type ? "Generating..." : "Download CSV"}
              </button>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
