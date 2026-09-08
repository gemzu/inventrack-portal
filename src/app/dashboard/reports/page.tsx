"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { FileBarChart, Download, Loader2 } from "lucide-react";

const money = (n: number) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Rule, Figure, CrateSkeleton } from "@/components/console/surfaces";
import { normalizeOrderStatus, ORDER_STATUS } from "@/lib/orderStatus";

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
    totalValue: 0,
    totalCost: 0,
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

      // Valuation of available stock (retail value + cost basis / COGS).
      const avail = items.filter((i) => i.status === "available");
      const totalValue = avail.reduce((s, i) => s + (Number(i.selling_price) || 0) * (Number(i.quantity) || 0), 0);
      const totalCost = avail.reduce((s, i) => s + (Number(i.cost_price) || 0) * (Number(i.quantity) || 0), 0);

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
        totalValue,
        totalCost,
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
      } else if (type === "valuation") {
        const { data } = await supabase.from("inventory").select("*").eq("org_id", orgId).eq("status", "available");
        const items = data || [];
        const header = "Model ID,Brand,Category,Quantity,Unit Cost,Unit Price,Cost Value,Retail Value";
        const rows = items.map((i) => {
          const q = Number(i.quantity) || 0;
          const cost = Number(i.cost_price) || 0;
          const price = Number(i.selling_price) || 0;
          return [
            i.model_id || "", i.brand || "", i.category || "", String(q),
            cost.toFixed(2), price.toFixed(2), (cost * q).toFixed(2), (price * q).toFixed(2),
          ];
        });
        downloadCsv("valuation_report.csv", header, rows);
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
      <PageShell title="Reports" subtitle="Reading the floor.">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-background p-5">
              <CrateSkeleton className="h-8 w-24 border-0" delay={i * 0.06} />
              <CrateSkeleton className="mt-3 h-2.5 w-16 border-0" delay={i * 0.06 + 0.04} />
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  if (!orgId) {
    return (
      <PageShell title="Reports">
        <EmptyState
          icon={FileBarChart}
          title="No organization"
          description="Join an organization and its reports appear here."
        />
      </PageShell>
    );
  }

  const REPORTS = [
    { title: "Inventory", desc: "Every field on every line, as CSV.", type: "inventory" },
    { title: "Orders", desc: "Buyers, states, and line counts.", type: "orders" },
    { title: "Ops digest", desc: "One file of headline figures for whoever asks.", type: "ops_digest" },
    { title: "Activity", desc: "The last thousand scans, in order.", type: "activity" },
    { title: "Valuation and COGS", desc: "Cost, retail, and margin per line on hand.", type: "valuation" },
  ];

  return (
    <PageShell
      title="Reports"
     
      subtitle="Where the floor stands, and everything you can take away as a file."
    >
      <div className="space-y-12">
        {/* ──
            The snapshot. Money last, because it is derived from the counts
            above it and reads better as a conclusion than as a headline. ── */}
        <section className="space-y-5">
          <Rule label="Right now" />
          <div className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
            {[
              { label: "Units on hand", value: snapshot.totalItems },
              { label: "Available", value: snapshot.available },
              { label: "Reserved", value: snapshot.reserved },
              { label: "Sold", value: snapshot.sold },
              { label: "Retail value", value: money(snapshot.totalValue) },
              { label: "At cost", value: money(snapshot.totalCost) },
              {
                label: "Potential margin",
                value: money(snapshot.totalValue - snapshot.totalCost),
                tone: "brand" as const,
              },
            ].map((s) => (
              <div key={s.label} className="bg-background p-5">
                <Figure
                  label={s.label}
                  value={s.value}
                  tone={s.tone}
                  className="[&_.figure-value]:text-[clamp(1.4rem,0.9rem+1.4vw,2rem)]"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── This month ─────────────────────────────────────── */}
        <section className="space-y-5">
          <Rule label="This month" />
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Orders placed" value={snapshot.ordersThisMonth} />
            <Figure label="Fulfilled" value={snapshot.fulfillmentRate} suffix="%" />
            <Figure
              label="Still pending"
              value={snapshot.ordersPending}
              tone={snapshot.ordersPending ? "warning" : undefined}
            />
            <Figure
              label="Approvals queued"
              value={snapshot.pendingApprovals}
              tone={snapshot.pendingApprovals ? "brand" : undefined}
            />
            <Figure
              label="Rejected"
              value={snapshot.ordersRejected}
              tone={snapshot.ordersRejected ? "destructive" : undefined}
            />
          </div>
        </section>

        {/* ── Running low ────────────────────────────────────── */}
        {snapshot.lowStockItems.length > 0 && (
          <section className="space-y-5">
            <Rule
              label="Running low"
              action={
                <button
                  onClick={() => generateReport("low_stock")}
                  disabled={generating === "low_stock"}
                  className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors duration-300 hover:text-[var(--brand-2)] disabled:opacity-40"
                >
                  {generating === "low_stock" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  CSV
                </button>
              }
            />
            <Panel className="reveal">
              {snapshot.lowStockItems.slice(0, 8).map((item, i) => (
                <div key={i} className="row-line flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.modelId}</p>
                    {item.brand && (
                      <p className="truncate text-[12px] text-muted-foreground">
                        {item.brand}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-warning">
                    {item.quantity}
                  </span>
                </div>
              ))}
              {snapshot.lowStockItems.length > 8 && (
                <p className="px-5 py-3 text-[12px] text-muted-foreground">
                  and {snapshot.lowStockItems.length - 8} more
                </p>
              )}
            </Panel>
          </section>
        )}

        {/* ── Take it away ───────────────────────────────────── */}
        <section className="space-y-5">
          <Rule label="Take it away" />
          <div className="reveal grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((r) => (
              <button
                key={r.type}
                onClick={() => generateReport(r.type)}
                disabled={generating === r.type}
                className="group bg-background p-5 text-left transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--brand-2)_5%,transparent)] disabled:opacity-50"
              >
                <p className="font-display text-[15px] font-bold tracking-[-0.015em]">{r.title}</p>
                <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                  {r.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors duration-300 group-hover:text-[var(--brand-2)]">
                  {generating === r.type ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {generating === r.type ? "Generating" : "Download CSV"}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
