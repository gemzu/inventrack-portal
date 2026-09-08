"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ShoppingCart, ChevronDown, Search, Eye, Check, X } from "lucide-react";
import { statusColor, formatDateTime } from "@/lib/utils";
import { normalizeOrderStatus, orderStatusLabel, ORDER_STATUS_FLOW, ORDER_STATUS } from "@/lib/orderStatus";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/page-shell";

interface OrderItem {
  modelId: string;
  barcode: string;
  description?: string;
  quantity: number;
}

interface Order {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerCompany?: string;
  items: OrderItem[];
  totalQty: number;
  status: string;
  orderedBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

function mapOrder(row: Record<string, unknown>): Order {
  const items = Array.isArray(row.items) ? (row.items as OrderItem[]) : [];
  return {
    id: row.id as string,
    buyerName: (row.buyer_name as string) || "",
    buyerEmail: (row.buyer_email as string) || "",
    buyerCompany: row.buyer_company as string | undefined,
    items,
    totalQty: (row.total_qty as number) || items.length,
    status: normalizeOrderStatus(row.status as string),
    orderedBy: (row.ordered_by as string) || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_STATUSES = [...ORDER_STATUS_FLOW];

export default function OrdersPage() {
  const { orgId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      const mapped = (data || []).map(mapOrder);
      setOrders(mapped);
      setFiltered(mapped);
      setLoading(false);
    };
    load();
  }, [orgId]);

  useEffect(() => {
    let result = orders;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) => o.buyerName?.toLowerCase().includes(s) || o.buyerEmail?.toLowerCase().includes(s) || o.buyerCompany?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") result = result.filter((o) => normalizeOrderStatus(o.status) === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, orders]);

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    try {
      const normalizedNext = normalizeOrderStatus(newStatus);
      const { error } = await supabase.from("orders").update({ status: normalizedNext }).eq("id", order.id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: normalizedNext } : o)));
      if (selectedOrder?.id === order.id) setSelectedOrder({ ...order, status: normalizedNext });
      toast(`Order ${normalizedNext === ORDER_STATUS.CONFIRMED ? "approved" : normalizedNext === ORDER_STATUS.CANCELLED ? "rejected" : "updated to " + orderStatusLabel(normalizedNext)}`, "success");
    } catch {
      toast("Failed to update order status", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageShell title="Orders" subtitle={`${filtered.length} order${filtered.length !== 1 ? "s" : ""}`}>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer name, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-input border-border text-foreground"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer bg-input border-border text-foreground"
          >
            <option value="all">All Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{orderStatusLabel(s)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      <Card className="overflow-hidden"><CardContent className="p-0">
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" description="Orders placed by buyers will appear here for review and approval." />
        ) : (
          filtered.map((order) => {
            const pending = normalizeOrderStatus(order.status) === ORDER_STATUS.PENDING_APPROVAL;
            return (
              <div key={order.id} className="group flex items-center gap-4 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-primary/[0.05] transition-colors">
                <button onClick={() => setSelectedOrder(order)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                    {(order.buyerName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{order.buyerName || "Unknown buyer"}</div>
                    <div className="text-xs text-muted-foreground truncate">{order.buyerCompany || order.buyerEmail}</div>
                  </div>
                </button>
                <div className="w-16 shrink-0 text-sm text-muted-foreground hidden sm:block">{order.totalQty} item{order.totalQty !== 1 ? "s" : ""}</div>
                <div className="shrink-0 hidden md:block">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(order.status)}`}>
                    {orderStatusLabel(order.status)}
                  </span>
                </div>
                <div className="w-32 shrink-0 text-xs text-muted-foreground hidden lg:block">{formatDateTime(order.createdAt as string)}</div>
                {/* Actions — always visible, pinned right */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {pending && (
                    <>
                      <button onClick={() => updateOrderStatus(order, ORDER_STATUS.CONFIRMED)} title="Approve" className="w-9 h-9 rounded-lg flex items-center justify-center bg-success/10 text-success hover:bg-success hover:text-white transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateOrderStatus(order, ORDER_STATUS.CANCELLED)} title="Reject" className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedOrder(order)} title="View" className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </CardContent></Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto"><CardContent className="p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Order Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Buyer:</span> <strong>{selectedOrder.buyerName}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span>{selectedOrder.buyerEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Company:</span> <span>{selectedOrder.buyerCompany || "-"}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(selectedOrder.status)}`}>
                  {orderStatusLabel(selectedOrder.status)}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Qty:</span> <strong>{selectedOrder.totalQty}</strong></div>

              <h4 className="font-semibold mt-4 pt-4 border-t border-border">Line Items</h4>
              {selectedOrder.items?.map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-border">
                  <div>
                    <div className="font-medium">{item.modelId}</div>
                    <div className="text-xs font-mono text-muted-foreground">{item.barcode}</div>
                  </div>
                  <div className="font-medium">x{item.quantity}</div>
                </div>
              ))}

              {normalizeOrderStatus(selectedOrder.status) === ORDER_STATUS.PENDING_APPROVAL && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateOrderStatus(selectedOrder, ORDER_STATUS.CONFIRMED)}
                    className="flex-1 py-2 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder, ORDER_STATUS.CANCELLED)}
                    className="flex-1 py-2 rounded-xl bg-danger text-white text-sm font-medium hover:opacity-90 transition"
                  >
                    Reject
                  </button>
                </div>
              )}

              {normalizeOrderStatus(selectedOrder.status) === ORDER_STATUS.CONFIRMED && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder, ORDER_STATUS.PROCESSING)}
                  className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition mt-2"
                >
                  Mark Processing
                </button>
              )}
            </div>
            <Button variant="outline" onClick={() => setSelectedOrder(null)} className="mt-4 w-full h-10">
              Close
            </Button>
          </CardContent></Card>
        </div>
      )}
    </PageShell>
  );
}
