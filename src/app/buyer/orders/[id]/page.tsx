"use client";

import { itemIdentity } from "@/lib/itemIdentity";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/dataService";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import Status from "@/components/Status";
import { Panel, Rule, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Package, Clock, CheckCircle2, Truck, ArrowLeft } from "lucide-react";

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
  const units = order?.totalQty ?? items.reduce((a, i) => a + (i.quantity ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title={
          loading
            ? "Order"
            : !order
              ? "Not found"
              : order.orderName || String(order.id).slice(0, 8).toUpperCase()
        }
        eyebrow="Order"
        subtitle={
          order?.createdAt ? new Date(order.createdAt).toLocaleString() : undefined
        }
        breadcrumb={
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All orders
          </Link>
        }
        actions={
          order ? <Status status={order.status || "pending_approval"} emphasis /> : undefined
        }
      >
        {loading ? (
          <div className="space-y-6">
            <CrateSkeleton className="h-24 w-full" />
            <CrateSkeleton className="h-64 w-full" delay={0.1} />
          </div>
        ) : !order ? (
          <EmptyState
            icon={Package}
            title="No such order"
            description="It may have been removed, or it belongs to a different account."
          />
        ) : (
          <div className="space-y-12">
            {/* ── Where it is ─────────────────────────────────── */}
            <section className="space-y-5">
              <Rule label="Progress" />
              {cancelled ? (
                <p className="reveal text-sm leading-relaxed text-destructive">
                  This order was cancelled. Nothing shipped.
                </p>
              ) : (
                /* A rail with ticks on it, not a row of filled circles with a
                   glow ring. The line is the journey; the ticks are where it
                   has got to. */
                <div className="reveal">
                  <div className="relative flex items-start justify-between gap-2">
                    <span className="absolute left-0 right-0 top-[7px] h-px bg-border" />
                    <span
                      className="absolute left-0 top-[7px] h-px bg-[linear-gradient(to_right,var(--brand-1),var(--brand-3))] transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.30,1)]"
                      style={{
                        width: `${(activeStep / Math.max(STATUS_STEPS.length - 1, 1)) * 100}%`,
                      }}
                    />
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= activeStep;
                      return (
                        <div
                          key={step.key}
                          className="relative flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center"
                        >
                          <span
                            className={`h-3.5 w-3.5 shrink-0 rounded-sm border transition-colors duration-500 ${
                              done
                                ? "border-[var(--brand-2)] bg-[var(--brand-2)]"
                                : "border-border bg-background"
                            }`}
                          />
                          <span
                            className={`mono text-[10px] uppercase tracking-[0.14em] ${
                              done ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* ── What is on it ───────────────────────────────── */}
            <section className="space-y-5">
              <Rule
                label="Lines"
                action={
                  <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {items.length} · {units} units
                  </span>
                }
              />
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lines recorded on this order.</p>
              ) : (
                <Panel className="reveal">
                  {items.map((item, i) => {
                    const id = itemIdentity(item);
                    return (
                      <div
                        key={i}
                        className="row-line flex items-center justify-between gap-4 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                            {id.title}
                          </p>
                          {id.subtitle && (
                            <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              {id.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="mono shrink-0 text-sm font-semibold tabular-nums">
                          {item.quantity ?? 1}
                        </span>
                      </div>
                    );
                  })}
                </Panel>
              )}
            </section>

            {/* ── Shipping ────────────────────────────────────── */}
            {(order.trackingNumber || order.carrier || order.packingNotes) && (
              <section className="space-y-5">
                <Rule label="Shipping" />
                <div className="reveal">
                  {order.carrier && (
                    <div className="row-line flex items-center justify-between gap-6 py-3">
                      <ColHead>Carrier</ColHead>
                      <span className="truncate text-sm">{order.carrier}</span>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="row-line flex items-center justify-between gap-6 py-3">
                      <ColHead>Tracking</ColHead>
                      <span className="mono truncate text-sm">{order.trackingNumber}</span>
                    </div>
                  )}
                  {order.packingNotes && (
                    <div className="py-3">
                      <ColHead className="mb-2 block">Notes</ColHead>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {order.packingNotes}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <Link
                href="/buyer/messages"
                className="mono inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-[border-color,color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]"
              >
                Ask about this order
              </Link>
              <Link
                href="/buyer/orders"
                className="mono inline-flex items-center px-2 py-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
              >
                All orders
              </Link>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}
