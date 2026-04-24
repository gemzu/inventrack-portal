"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
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
  Store,
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
  storefrontId?: string;
}

const STATUS_STEPS = [
  { key: "pending_approval", label: "Pending", icon: Clock },
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

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // Get storefront orgs for this buyer
    supabase.from("storefront_buyers").select("storefronts(org_id)")
      .eq("buyer_id", user.id).eq("status", "active")
      .then(({ data: sfs }) => {
        if (!sfs || sfs.length === 0) {
          setOrder(null);
          setLoading(false);
          return;
        }
        const orgIds = sfs.map((s: any) => s.storefronts?.org_id).filter(Boolean);
        if (orgIds.length === 0) {
          setOrder(null);
          setLoading(false);
          return;
        }
        return supabase.from("orders").select("*").in("org_id", orgIds).eq("buyer_id", user.id)
          .then(({ data, error }) => {
            if (error) {
              toast(error.message || "Failed to load order", "error");
            } else {
              const found = (data || []).find((r) => String(r.id) === id) || null;
              setOrder(found);
            }
            setLoading(false);
          });
      });
  }, [user, id, toast]);

  const activeStep = statusIndex(order?.status);
  const cancelled = order?.status === "cancelled";
  const items = useMemo(() => order?.items ?? [], [order]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-5xl mx-auto px-4 py-10">
          <Link href="/buyer/orders" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#E398CA] mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to orders
          </Link>

          {loading ? (
            <Skeleton className="h-10 w-64" />
          ) : !order ? (
            <h1 className="text-3xl font-bold" style={{ color: '#1f1a1d' }}>Order not found</h1>
          ) : (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1f1a1d' }}>
                  {order.orderName || `Order #${order.id.slice(0, 8)}`}
                </h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" style={{ color: '#E398CA' }} />
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    <Hash className="w-3.5 h-3.5" />{order.id.slice(0, 8)}
                  </span>
                </p>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1" style={order.status === 'delivered' ? { background: '#22c55e', color: 'white' } : order.status === 'cancelled' ? { background: '#ef4444', color: 'white' } : { background: '#E398CA', color: 'white' }}>
                {(order.status || "pending").replace(/_/g, " ")}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </>
        ) : !order ? (
          <div className="text-center py-20 bg-white rounded-2xl" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Package className="w-16 h-16 mx-auto text-gray-300" />
            <h2 className="text-xl font-semibold mt-4" style={{ color: '#1f1a1d' }}>Order not found</h2>
            <p className="text-gray-500">This order doesn't exist or you don't have access.</p>
          </div>
        ) : (
          <>
            {/* Status timeline */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-5" style={{ color: '#1f1a1d' }}>Order status</h2>
              {cancelled ? (
                <div className="flex items-center gap-3" style={{ color: '#ef4444' }}>
                  <XCircle className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Cancelled</div>
                    <div className="text-sm text-gray-500">This order was cancelled.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-0 overflow-x-auto pb-1">
                  {STATUS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= activeStep;
                    const current = i === activeStep;
                    return (
                      <div key={step.key} className="flex items-center flex-1 min-w-[100px]">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'text-white' : 'text-gray-400'}`}
                            style={done ? { background: '#E398CA', borderColor: '#E398CA' } : { borderColor: '#e0e0e0' }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-xs text-center whitespace-nowrap ${done ? 'font-medium' : 'text-gray-400'}`}
                            style={done ? { color: '#1f1a1d' } : {}}>
                            {step.label}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className="flex-1 h-0.5 mx-1" style={{ background: i < activeStep ? '#E398CA' : '#e0e0e0' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: '#1f1a1d' }}>Items</h2>
                <div className="text-sm text-gray-500">
                  {items.length} line{items.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold" style={{ color: '#1f1a1d' }}>
                    {order.totalQty ?? items.reduce((a, i) => a + (i.quantity ?? 0), 0)}
                  </span>{" "}unit{((order.totalQty ?? 0) !== 1) ? "s" : ""}
                </div>
              </div>
              {items.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">No items on this order.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                          <Package className="w-5 h-5" style={{ color: '#E398CA' }} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate" style={{ color: '#1f1a1d' }}>{item.displayName || item.modelId || "Item"}</div>
                          {item.barcode ? <div className="text-xs text-gray-400 font-mono">{item.barcode}</div> : null}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-semibold" style={{ color: '#1f1a1d' }}>×{item.quantity ?? 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping */}
            {(order.trackingNumber || order.carrier || order.packingNotes) && (
              <div className="bg-white rounded-2xl p-6 space-y-3" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#1f1a1d' }}>Shipping</h2>
                {order.carrier && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Carrier</span>
                    <span style={{ color: '#1f1a1d' }}>{order.carrier}</span>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tracking</span>
                    <span className="font-mono" style={{ color: '#1f1a1d' }}>{order.trackingNumber}</span>
                  </div>
                )}
                {order.packingNotes && (
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">Notes</div>
                    <div className="bg-gray-50 p-3 rounded-md">{order.packingNotes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/buyer/messages" className="flex-1">
                <Button variant="outline" className="w-full" style={{ border: '1px solid #E398CA', color: '#E398CA' }}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Message owner
                </Button>
              </Link>
              <Link href="/buyer/orders" className="flex-1">
                <Button variant="ghost" className="w-full" style={{ color: '#666' }}>All orders</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}