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
    <div className="animate-page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Items</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition border-b border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.buyerName}</div>
                    <div className="text-xs text-muted-foreground">{order.buyerEmail}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{order.buyerCompany || "-"}</td>
                  <td className="px-4 py-3 font-medium">{order.totalQty}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(order.status)}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt as string)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      {normalizeOrderStatus(order.status) === ORDER_STATUS.PENDING_APPROVAL && (
                        <>
                          <button onClick={() => updateOrderStatus(order, ORDER_STATUS.CONFIRMED)} className="p-1.5 rounded-lg hover:bg-success/10 text-success transition">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateOrderStatus(order, ORDER_STATUS.CANCELLED)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={ShoppingCart} title="No orders found" description="Orders placed by buyers will appear here for review and approval." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition mt-2"
                >
                  Mark Processing
                </button>
              )}
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="mt-4 w-full py-2 rounded-xl border text-sm font-medium hover:border-primary transition"
            >
              Close
            </button>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
