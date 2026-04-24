"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/Toast";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowLeft,
  Hash,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface OrderItem {
  modelId?: string;
  barcode?: string;
  displayName?: string;
  quantity?: number;
}

interface Order {
  id: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  orderName?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerCompany?: string;
  items?: OrderItem[];
  totalQty?: number;
  trackingNumber?: string;
  carrier?: string;
  packingNotes?: string;
}

const STATUS_STEPS = [
  { key: "pending_approval", label: "Pending approval", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function statusIndex(status?: string) {
  if (!status) return 0;
  if (status === "cancelled") return -1;
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

function statusColor(status?: string) {
  if (status === "cancelled") return "text-destructive bg-destructive/10 border-destructive/30";
  if (status === "delivered") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  if (status === "shipped") return "text-blue-500 bg-blue-500/10 border-blue-500/30";
  if (status === "processing" || status === "confirmed")
    return "text-amber-500 bg-amber-500/10 border-amber-500/30";
  return "text-muted-foreground bg-muted border-border";
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
  const cancelled = order?.status === "cancelled";
  const items = useMemo(() => order?.items ?? [], [order]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative max-w-5xl mx-auto px-4 py-10">
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to orders
          </Link>

          {loading ? (
            <Skeleton className="h-10 w-64" />
          ) : !order ? (
            <h1 className="text-3xl font-bold">Order not found</h1>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {order.orderName || `Order #${order.id.slice(0, 8)}`}
                  </h1>
                  <p className="text-muted-foreground mt-1 flex items-center gap-4 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString()
                        : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                      <Hash className="w-3.5 h-3.5" />
                      {order.id.slice(0, 8)}
                    </span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-1 ${statusColor(order.status)}`}
                >
                  {(order.status || "pending").replace(/_/g, " ")}
                </Badge>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : !order ? (
          <div className="text-center py-20 text-muted-foreground">
            This order doesn&apos;t exist or you don&apos;t have access to it.
          </div>
        ) : (
          <>
            {/* Status timeline */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-5">Order status</h2>
              {cancelled ? (
                <div className="flex items-center gap-3 text-destructive">
                  <XCircle className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Cancelled</div>
                    <div className="text-sm text-muted-foreground">
                      This order was cancelled.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-0 overflow-x-auto pb-1">
                  {STATUS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= activeStep;
                    const current = i === activeStep;
                    return (
                      <div key={step.key} className="flex items-center flex-1 min-w-[120px]">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                              done
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-background border-border text-muted-foreground"
                            } ${current ? "ring-4 ring-primary/20" : ""}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span
                            className={`text-xs text-center whitespace-nowrap ${
                              done ? "text-foreground font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-1 ${
                              i < activeStep ? "bg-primary" : "bg-border"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold">Items</h2>
                <div className="text-sm text-muted-foreground">
                  {items.length} line{items.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold text-foreground">
                    {order.totalQty ?? items.reduce((a, i) => a + (i.quantity ?? 0), 0)}
                  </span>{" "}
                  unit{(order.totalQty ?? 0) !== 1 ? "s" : ""}
                </div>
              </div>
              {items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No items on this order.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {item.displayName || item.modelId || "Item"}
                          </div>
                          {item.barcode ? (
                            <div className="text-xs text-muted-foreground font-mono">
                              {item.barcode}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-semibold">×{item.quantity ?? 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping / tracking */}
            {(order.trackingNumber || order.carrier || order.packingNotes) && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <h2 className="text-lg font-semibold">Shipping</h2>
                {order.carrier && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Carrier</span>
                    <span>{order.carrier}</span>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tracking</span>
                    <span className="font-mono">{order.trackingNumber}</span>
                  </div>
                )}
                {order.packingNotes && (
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1">Notes</div>
                    <div className="bg-muted/40 p-3 rounded-md">{order.packingNotes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/buyer/messages" className="flex-1">
                <Button variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message admin
                </Button>
              </Link>
              <Link href="/buyer/orders" className="flex-1">
                <Button variant="ghost" className="w-full">
                  All orders
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
