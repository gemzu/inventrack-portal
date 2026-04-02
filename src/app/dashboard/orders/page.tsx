"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ShoppingCart, ChevronDown, Search, Eye, Check, X } from "lucide-react";
import { statusColor, formatDateTime } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

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
    status: (row.status as string) || "pending",
    orderedBy: (row.ordered_by as string) || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_STATUSES = ["pending", "pending_approval", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"];

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
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, orders]);

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
      if (selectedOrder?.id === order.id) setSelectedOrder({ ...order, status: newStatus });
      toast(`Order ${newStatus === "confirmed" ? "approved" : newStatus === "cancelled" ? "rejected" : "updated to " + newStatus}`, "success");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{filtered.length} orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer name, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <option value="all">All Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--muted)" }}>Company</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Items</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Status</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--muted)" }}>Date</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.buyerName}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{order.buyerEmail}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{order.buyerCompany || "-"}</td>
                  <td className="px-4 py-3 font-medium">{order.totalQty}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(order.status)}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs" style={{ color: "var(--muted)" }}>
                    {formatDateTime(order.createdAt as string)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      {(order.status === "pending" || order.status === "pending_approval") && (
                        <>
                          <button onClick={() => updateOrderStatus(order, "confirmed")} className="p-1.5 rounded-lg hover:bg-success/10 text-success transition">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateOrderStatus(order, "cancelled")} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition">
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
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Order Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Buyer:</span> <strong>{selectedOrder.buyerName}</strong></div>
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Email:</span> <span>{selectedOrder.buyerEmail}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Company:</span> <span>{selectedOrder.buyerCompany || "-"}</span></div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(selectedOrder.status)}`}>
                  {selectedOrder.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Total Qty:</span> <strong>{selectedOrder.totalQty}</strong></div>

              <h4 className="font-semibold mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>Line Items</h4>
              {selectedOrder.items?.map((item, i) => (
                <div key={i} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div className="font-medium">{item.modelId}</div>
                    <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>{item.barcode}</div>
                  </div>
                  <div className="font-medium">x{item.quantity}</div>
                </div>
              ))}

              {(selectedOrder.status === "pending" || selectedOrder.status === "pending_approval") && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateOrderStatus(selectedOrder, "confirmed")}
                    className="flex-1 py-2 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder, "cancelled")}
                    className="flex-1 py-2 rounded-xl bg-danger text-white text-sm font-medium hover:opacity-90 transition"
                  >
                    Reject
                  </button>
                </div>
              )}

              {selectedOrder.status === "confirmed" && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder, "processing")}
                  className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition mt-2"
                >
                  Mark Processing
                </button>
              )}
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="mt-4 w-full py-2 rounded-xl border text-sm font-medium hover:border-primary transition"
              style={{ borderColor: "var(--border)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
