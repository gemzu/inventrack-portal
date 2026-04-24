"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/dataService";
import { useToast } from "@/components/Toast";
import {
  Package, Clock, CheckCircle2, Truck, XCircle,
  ArrowLeft, Hash, Calendar, MessageSquare, RotateCcw,
} from "lucide-react";

interface OrderItem {
  modelId?: string; barcode?: string; displayName?: string; quantity?: number;
}
interface Order {
  id: string; status?: string; paymentStatus?: string;
  createdAt?: string; updatedAt?: string;
  orderName?: string; buyerName?: string; buyerEmail?: string; buyerCompany?: string;
  items?: OrderItem[]; totalQty?: number;
  trackingNumber?: string; carrier?: string; packingNotes?: string;
}

const STATUS_STEPS = [
  { key: "pending_approval", label: "Pending",    icon: Clock },
  { key: "confirmed",        label: "Confirmed",  icon: CheckCircle2 },
  { key: "processing",       label: "Processing", icon: RotateCcw },
  { key: "shipped",          label: "Shipped",    icon: Truck },
  { key: "delivered",        label: "Delivered",  icon: CheckCircle2 },
];

function statusIndex(status?: string) {
  if (!status || status === "cancelled") return -1;
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

function statusBadgeClass(status?: string) {
  if (status === "cancelled" || status === "rejected")
    return "bg-destructive/10 text-destructive border-destructive/30";
  if (status === "delivered")
    return "bg-success/10 text-success border-success/30";
  if (status === "shipped")
    return "bg-purple-500/10 text-purple-500 border-purple-500/30";
  if (status === "processing" || status === "confirmed")
    return "bg-blue-500/10 text-blue-500 border-blue-500/30";
  return "bg-warning/10 text-warning border-warning/30";
}

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) return;
    setLoading(true);
    getOrders(orgId, { buyerId: user.id })
      .then((rows) => {
        const found = (rows as unknown as Order[]).find((r) => String(r.id) === id) || null;
        setOrder(found);
      })
      .catch((e) => toast((e as Error).message || "Failed to load order", "error"))
      .finally(() => setLoading(false));
  }, [orgId, user, id, toast]);

  const activeStep = statusIndex(order?.status);
  const cancelled = order?.status === "cancelled" || order?.status === "rejected";
  const items = useMemo(() => order?.items ?? [], [order]);

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to orders
          </Link>

          {loading ? (
            <div className="h-10 w-56 bg-secondary rounded-xl animate-pulse" />
          ) : !order ? (
            <h1 className="text-2xl font-bold text-foreground">Order not found</h1>
          ) : (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {order.orderName || `Order #${order.id.slice(0, 8).toUpperCase()}`}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    <Hash className="w-3 h-3" />
                    {order.id.slice(0, 8)}
                  </span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusBadgeClass(order.status)}`}>
                {(order.status || "pending").replace(/_/g, " ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <>
            <div className="card-luxury h-32 animate-pulse bg-secondary/50" />
            <div className="card-luxury h-48 animate-pulse bg-secondary/50" />
          </>
        ) : !order ? (
          <div className="text-center py-20 text-muted-foreground">
            This order doesn&apos;t exist or you don&apos;t have access to it.
          </div>
        ) : (
          <>
            {/* Status timeline */}
            <div className="card-luxury p-6 scale-in">
              <h2 className="text-sm font-semibold text-foreground mb-5">Order status</h2>
              {cancelled ? (
                <div className="flex items-center gap-3 text-destructive">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold capitalize">{order.status}</div>
                    <div className="text-sm text-muted-foreground">This order was cancelled.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center overflow-x-auto pb-2">
                  {STATUS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= activeStep;
                    const current = i === activeStep;
                    return (
                      <div key={step.key} className="flex items-center flex-1 min-w-[90px]">
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                            done
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-border text-muted-foreground"
                          } ${current ? "ring-4 ring-primary/20 scale-110" : ""}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] text-center whitespace-nowrap font-medium ${
                            done ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${
                            i < activeStep ? "bg-primary" : "bg-border"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="card-luxury overflow-hidden scale-in" style={{ animationDelay: "60ms" }}>
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Items</h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} line{items.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold text-foreground">
                    {order.totalQty ?? items.reduce((a, i) => a + (i.quantity ?? 0), 0)}
                  </span>{" "}
                  units
                </span>
              </div>
              {items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No items on this order.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">
                            {item.displayName || item.modelId || "Item"}
                          </div>
                          {item.barcode && (
                            <div className="text-xs text-muted-foreground font-mono">{item.barcode}</div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 font-semibold text-foreground">
                        ×{item.quantity ?? 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping */}
            {(order.trackingNumber || order.carrier || order.packingNotes) && (
              <div className="card-luxury p-6 space-y-3 scale-in" style={{ animationDelay: "120ms" }}>
                <h2 className="text-sm font-semibold text-foreground">Shipping</h2>
                {order.carrier && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Carrier</span>
                    <span className="text-foreground">{order.carrier}</span>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tracking</span>
                    <span className="text-foreground font-mono">{order.trackingNumber}</span>
                  </div>
                )}
                {order.packingNotes && (
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1.5">Notes</div>
                    <div className="bg-secondary/50 p-3 rounded-lg text-foreground text-sm">
                      {order.packingNotes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 scale-in" style={{ animationDelay: "180ms" }}>
              <Link
                href="/buyer/messages"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-foreground text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Message admin
              </Link>
              <Link
                href="/buyer/orders"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
              >
                All orders
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
