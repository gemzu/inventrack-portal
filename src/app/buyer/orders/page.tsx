"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  ClipboardList, Package, Clock, CheckCircle, XCircle,
  ArrowRight, ShoppingBag, Truck, RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface Order {
  id: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  totalQty?: number;
  total_qty?: number;
  items?: Array<{ displayName?: string; modelId?: string }>;
  orderName?: string;
  order_name?: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  className: string;
  dotColor: string;
}> = {
  pending_approval: {
    label: "Pending approval",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/30",
    dotColor: "bg-warning",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    dotColor: "bg-blue-500",
  },
  processing: {
    label: "Processing",
    icon: RotateCcw,
    className: "bg-indigo/10 text-indigo border-indigo/30",
    dotColor: "bg-indigo",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    className: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    dotColor: "bg-purple-500",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/30",
    dotColor: "bg-success",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dotColor: "bg-destructive",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dotColor: "bg-destructive",
  },
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BuyerOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: storefronts } = await supabase
          .from("storefront_buyers")
          .select("storefronts(org_id)")
          .eq("buyer_id", user.id)
          .eq("status", "active");

        if (!storefronts || storefronts.length === 0) {
          setOrders([]);
          return;
        }

        const orgIds = (storefronts as Array<{ storefronts?: { org_id?: string } }>)
          .map((s) => s.storefronts?.org_id)
          .filter(Boolean) as string[];

        if (orgIds.length === 0) { setOrders([]); return; }

        const { data: orderData, error } = await supabase
          .from("orders")
          .select("*")
          .in("org_id", orgIds)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setOrders((orderData || []) as Order[]);
      } catch (e) {
        toast((e as Error).message || "Failed to load orders", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => (o.status || "pending_approval") === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      const s = o.status || "pending_approval";
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [orders]);

  const filters = [
    { key: "all", label: "All" },
    { key: "pending_approval", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ].filter((f) => f.key === "all" || (counts[f.key] ?? 0) > 0);

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Orders</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            {loading ? "Loading…" : `${orders.length} order${orders.length !== 1 ? "s" : ""} total`}
          </p>

          {/* Filter tabs */}
          {!loading && filters.length > 1 && (
            <div className="flex gap-2 mt-5 overflow-x-auto pb-1 no-scrollbar">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all duration-200 ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {f.label}
                  {counts[f.key] != null && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filter === f.key ? "bg-primary-foreground/20" : "bg-secondary"
                    }`}>
                      {counts[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3 stagger-children">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-luxury p-5 h-28 animate-pulse bg-secondary/50" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <ClipboardList className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {filter === "all" ? "No orders yet" : `No ${filter.replace("_", " ")} orders`}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {filter === "all"
                ? "Submit your first order from the catalog."
                : "Try selecting a different filter above."}
            </p>
            {filter === "all" ? (
              <Link
                href="/buyer/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Browse catalog
              </Link>
            ) : (
              <button
                onClick={() => setFilter("all")}
                className="text-sm text-primary hover:underline"
              >
                View all orders
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {filteredOrders.map((order) => {
              const status = String(order.status || "pending_approval").toLowerCase();
              const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_approval;
              const StatusIcon = config.icon;
              const createdAt = String(order.createdAt || order.created_at || "");
              const totalQty = Number(order.totalQty || order.total_qty || 0);
              const orderItems = (order.items || []) as Array<{ displayName?: string; modelId?: string }>;
              const orderId = String(order.id || "");
              const orderName = String(order.orderName || order.order_name || "");

              return (
                <Link
                  key={orderId}
                  href={`/buyer/orders/${orderId}`}
                  className="group block"
                >
                  <div className="card-luxury p-5 hover:border-primary/40 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      {/* Status indicator */}
                      <div className="shrink-0 mt-0.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${config.className}`}>
                          <StatusIcon className="w-4.5 h-4.5" />
                        </div>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-foreground font-mono text-sm">
                            {orderName || `#${orderId.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                            {config.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(createdAt)}</span>
                          {totalQty > 0 && (
                            <>
                              <span className="text-border">·</span>
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {totalQty} unit{totalQty !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>

                        {orderItems.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {orderItems
                              .slice(0, 3)
                              .map((i) => i.displayName || i.modelId || "Item")
                              .join(", ")}
                            {orderItems.length > 3 && ` +${orderItems.length - 3} more`}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors duration-200">
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
