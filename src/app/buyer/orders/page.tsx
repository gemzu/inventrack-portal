"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { ClipboardList, Package, Clock, CheckCircle, XCircle, ArrowRight, ShoppingBag } from "lucide-react";
import { useToast } from "@/components/Toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_approval: { label: "Pending", color: "bg-warning/20 text-warning border-warning/30", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
  processing: { label: "Processing", color: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: Package },
  delivered: { label: "Delivered", color: "bg-success/20 text-success border-success/30", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive border-destructive/30", icon: XCircle },
  rejected: { label: "Rejected", color: "bg-destructive/20 text-destructive border-destructive/30", icon: XCircle },
};

export default function BuyerOrdersPage() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<{id?: string; status?: string; createdAt?: string; created_at?: string; totalQty?: number; total_qty?: number; items?: unknown[]}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) return;
    (async () => {
      try {
        const o = await getOrders(orgId, { buyerId: user.id });
        setOrders((o || []) as typeof orders);
      } catch (e) {
        toast((e as Error).message || "Failed to load orders", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, user, toast]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(String(a.createdAt || a.created_at || 0)).getTime();
      const dateB = new Date(String(b.createdAt || b.created_at || 0)).getTime();
      return dateB - dateA;
    });
  }, [orders]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              My Orders
            </span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid gap-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-muted/30 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Submit your first order from the cart.</p>
            <Link href="/buyer/catalog">
              <Button size="lg">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Browse Catalog
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 mt-6">
            {sortedOrders.map((order, index) => {
              const status = String(order.status || "pending_approval").toLowerCase();
              const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_approval;
              const StatusIcon = config.icon;
              const createdDate = new Date(String(order.createdAt || order.created_at || Date.now()));
              const totalQty = Number(order.totalQty || order.total_qty || 0);
              
              return (
                <Link
                  key={String(order.id)}
                  href={`/buyer/orders/${String(order.id)}`}
                  className="group block"
                >
                  <div 
                    className="relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    </div>

                    {/* Order Info */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl font-bold font-mono">
                            #{String(order.id || "").slice(0, 8).toUpperCase()}
                          </span>
                          {totalQty > 0 && (
                            <span className="px-2 py-1 bg-muted rounded-lg text-xs font-medium">
                              {totalQty} item{totalQty !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Created {createdDate.toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric", 
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </div>

                        {/* Items Preview */}
                        {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                          <div className="flex items-center gap-2 mt-4 text-sm">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {((order.items as unknown[]).slice(0, 3) as Array<{displayName?: string; modelId?: string}>).map((i) => i.displayName || i.modelId || "Item").join(", ")}
                              {((order.items as unknown[]).length > 3) ? ` +${(order.items as unknown[]).length - 3} more` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
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