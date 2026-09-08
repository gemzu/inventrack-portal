"use client";

/**
 * Orders.
 *
 * The list was a stack of rows each carrying an avatar circle in solid violet,
 * three icon buttons in tinted squares, and a detail modal built from
 * label/value rows. Rebuilt on the console: the row is the buyer and the
 * state, the two decisions a pending order needs are words rather than icons,
 * and the detail is a drawer with the lines set as data.
 *
 * The loading logic and every status transition are unchanged.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ShoppingCart } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  normalizeOrderStatus, orderStatusLabel, ORDER_STATUS_FLOW, ORDER_STATUS,
} from "@/lib/orderStatus";
import EmptyState from "@/components/EmptyState";
import Status from "@/components/Status";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import { Panel, Figure, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Drawer, SearchInput } from "@/components/console/controls";

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
        (o) =>
          o.buyerName?.toLowerCase().includes(s) ||
          o.buyerEmail?.toLowerCase().includes(s) ||
          o.buyerCompany?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((o) => normalizeOrderStatus(o.status) === statusFilter);
    }
    setFiltered(result);
  }, [search, statusFilter, orders]);

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    try {
      const normalizedNext = normalizeOrderStatus(newStatus);
      const { error } = await supabase
        .from("orders")
        .update({ status: normalizedNext })
        .eq("id", order.id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: normalizedNext } : o)));
      if (selectedOrder?.id === order.id) setSelectedOrder({ ...order, status: normalizedNext });
      toast(
        `Order ${
          normalizedNext === ORDER_STATUS.CONFIRMED
            ? "approved"
            : normalizedNext === ORDER_STATUS.CANCELLED
              ? "rejected"
              : "updated to " + orderStatusLabel(normalizedNext)
        }`,
        "success"
      );
    } catch {
      toast("Failed to update order status", "error");
    }
  };

  /* Awaiting a decision is the number this screen exists for, so it is stated
     rather than left for the reader to count. */
  const awaiting = useMemo(
    () => filtered.filter((o) => normalizeOrderStatus(o.status) === ORDER_STATUS.PENDING_APPROVAL).length,
    [filtered]
  );
  const units = useMemo(() => filtered.reduce((n, o) => n + (o.totalQty || 0), 0), [filtered]);

  if (loading) {
    return (
      <PageShell title="Orders" subtitle="Reading the book.">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <CrateSkeleton key={i} className="h-14 w-full" delay={i * 0.06} />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Orders"
      subtitle="Everything going out, and what it is waiting on."
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label="Orders shown" value={filtered.length} />
          <Figure label="Units" value={units} />
          <Figure
            label="Awaiting you"
            value={awaiting}
            tone={awaiting ? "brand" : undefined}
          />
        </div>

        <div className="space-y-4">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Buyer, company, or email"
            aria-label="Search orders"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Chip on={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              Any state
            </Chip>
            {ORDER_STATUSES.map((s) => (
              <Chip key={s} on={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {orderStatusLabel(s)}
              </Chip>
            ))}
          </div>
        </div>

        <Panel className="reveal">
          <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
            <ColHead className="min-w-0 flex-1">Buyer</ColHead>
            <ColHead className="w-20 shrink-0 text-right">Units</ColHead>
            <ColHead className="w-36 shrink-0">State</ColHead>
            <ColHead className="w-36 shrink-0">Placed</ColHead>
            <span className="w-32 shrink-0" />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nothing here"
              description="Orders placed by buyers land here for review."
            />
          ) : (
            filtered.map((order) => {
              const pending = normalizeOrderStatus(order.status) === ORDER_STATUS.PENDING_APPROVAL;
              return (
                <div key={order.id} className="row-line flex items-center gap-4 px-5 py-3">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">
                      {order.buyerName || "Unknown buyer"}
                    </p>
                    <p className="mono truncate text-[12px] text-muted-foreground">
                      {order.buyerCompany || order.buyerEmail || "No contact"}
                    </p>
                  </button>

                  <span className="mono hidden w-20 shrink-0 text-right text-sm tabular-nums md:block">
                    {order.totalQty}
                  </span>
                  <div className="hidden w-36 shrink-0 md:block">
                    <Status status={order.status} label={orderStatusLabel(order.status)} />
                  </div>
                  <span className="mono hidden w-36 shrink-0 text-[11px] text-muted-foreground lg:block">
                    {formatDateTime(order.createdAt as string)}
                  </span>

                  {/* Two words, not two coloured squares. A decision this
                      consequential should read as a sentence. */}
                  <div className="flex w-32 shrink-0 items-center justify-end gap-3">
                    {pending ? (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order, ORDER_STATUS.CONFIRMED)}
                          className="text-[12px] text-success transition-colors duration-300 hover:text-foreground"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order, ORDER_STATUS.CANCELLED)}
                          className="text-[12px] text-destructive transition-colors duration-300 hover:text-foreground"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[12px] text-muted-foreground transition-colors duration-300 hover:text-[var(--brand-2)]"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Panel>
      </div>

      <Drawer
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.buyerName || "Order"}
        subtitle={selectedOrder?.buyerEmail}
        footer={
          selectedOrder ? (
            normalizeOrderStatus(selectedOrder.status) === ORDER_STATUS.PENDING_APPROVAL ? (
              <>
                <Action
                  onClick={() => updateOrderStatus(selectedOrder, ORDER_STATUS.CANCELLED)}
                  className="flex-1 border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
                >
                  Reject
                </Action>
                <Action
                  solid
                  onClick={() => updateOrderStatus(selectedOrder, ORDER_STATUS.CONFIRMED)}
                  className="flex-1"
                >
                  Approve
                </Action>
              </>
            ) : normalizeOrderStatus(selectedOrder.status) === ORDER_STATUS.CONFIRMED ? (
              <Action
                solid
                onClick={() => updateOrderStatus(selectedOrder, ORDER_STATUS.PROCESSING)}
                className="flex-1"
              >
                Mark processing
              </Action>
            ) : (
              <Action onClick={() => setSelectedOrder(null)} className="flex-1">
                Close
              </Action>
            )
          ) : null
        }
      >
        {selectedOrder && (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-x-10 gap-y-5">
              <Figure
                label="Units"
                value={selectedOrder.totalQty}
                className="[&_.figure-value]:text-3xl"
              />
              <Figure
                label="Lines"
                value={selectedOrder.items?.length || 0}
                className="[&_.figure-value]:text-3xl"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-5">
              <div className="flex justify-between gap-4">
                <ColHead>Company</ColHead>
                <span className="truncate text-sm">{selectedOrder.buyerCompany || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <ColHead>State</ColHead>
                <Status
                  status={selectedOrder.status}
                  label={orderStatusLabel(selectedOrder.status)}
                  emphasis
                />
              </div>
              <div className="flex justify-between gap-4">
                <ColHead>Placed</ColHead>
                <span className="mono text-[11px] text-muted-foreground">
                  {formatDateTime(selectedOrder.createdAt as string)}
                </span>
              </div>
            </div>

            <div>
              <ColHead className="mb-3 block">Lines</ColHead>
              <Panel>
                {(selectedOrder.items || []).map((item, i) => (
                  <div
                    key={`${item.barcode}-${i}`}
                    className="row-line flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.modelId}</p>
                      <p className="mono truncate text-[11px] text-muted-foreground">
                        {item.barcode}
                      </p>
                    </div>
                    <span className="mono shrink-0 text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                  </div>
                ))}
                {(selectedOrder.items || []).length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No lines on this order.</p>
                )}
              </Panel>
            </div>
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}
