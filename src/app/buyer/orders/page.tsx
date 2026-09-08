"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ClipboardList, ArrowRight } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import Status from "@/components/Status";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";

export default function BuyerOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<{id?: string; status?: string; createdAt?: string; created_at?: string; totalQty?: number; total_qty?: number; items?: unknown[]}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // For buyers, we query by buyer_id but we need to know the org_id from storefronts
        // Get storefront orgs connected to this buyer first
        const { data: storefronts } = await supabase
          .from("storefront_buyers")
          .select("storefronts(org_id)")
          .eq("buyer_id", user.id)
          .eq("status", "active");
        
        if (!storefronts || storefronts.length === 0) {
          setOrders([]);
          return;
        }
        
        // Get all org_ids from connected storefronts
        const orgIds = storefronts
          .map((s: unknown) => (s as { storefronts?: { org_id?: string } })?.storefronts?.org_id)
          .filter(Boolean);
        
        if (orgIds.length === 0) {
          setOrders([]);
          return;
        }
        
        // Query orders from these orgs where buyer_id matches
        const { data: orderData, error } = await supabase
          .from("orders")
          .select("*")
          .in("org_id", orgIds)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setOrders((orderData || []) as typeof orders);
      } catch (e) {
        toast((e as Error).message || "Failed to load orders", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(String(a.createdAt || a.created_at || 0)).getTime();
      const dateB = new Date(String(b.createdAt || b.created_at || 0)).getTime();
      return dateB - dateA;
    });
  }, [orders]);
  const openCount = useMemo(
    () =>
      orders.filter(
        (o) => !["delivered", "cancelled", "rejected"].includes(String(o.status || "").toLowerCase())
      ).length,
    [orders]
  );

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title="Your orders"
        eyebrow="Buying"
        subtitle="Everything you have sent, newest first."
      >
        {loading ? (
          <ListSkeleton rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing ordered yet"
            description="Pick something from the catalog and send it from your cart."
            actionLabel="Browse the catalog"
            onAction={() => router.push("/buyer/catalog")}
          />
        ) : (
          <div className="space-y-8">
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label="Orders placed" value={orders.length} />
              <Figure label="Still moving" value={openCount} tone={openCount ? "brand" : undefined} />
            </div>

            <Panel className="reveal">
              <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                <ColHead className="w-28 shrink-0">Order</ColHead>
                <ColHead className="min-w-0 flex-1">What is on it</ColHead>
                <ColHead className="w-16 shrink-0 text-right">Units</ColHead>
                <ColHead className="w-32 shrink-0">State</ColHead>
              </div>

              {sortedOrders.map((order) => {
                const status = String(order.status || "pending_approval").toLowerCase();
                const created = new Date(String(order.createdAt || order.created_at || Date.now()));
                const totalQty = Number(order.totalQty || order.total_qty || 0);
                const lines = Array.isArray(order.items) ? (order.items as unknown[]) : [];
                const preview = (lines.slice(0, 3) as Array<{ displayName?: string; modelId?: string }>)
                  .map((i) => i.displayName || i.modelId || "Item")
                  .join(", ");

                return (
                  <Link
                    key={String(order.id)}
                    href={`/buyer/orders/${String(order.id)}`}
                    className="row-line group flex items-center gap-4 px-5 py-3.5"
                  >
                    {/* The reference is what you quote when you ask about it,
                        so it is set as a code rather than as a heading. */}
                    <span className="mono w-28 shrink-0 truncate text-sm font-semibold tracking-[0.04em]">
                      {String(order.id || "").slice(0, 8).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {preview || "No lines recorded"}
                        {lines.length > 3 ? ` +${lines.length - 3} more` : ""}
                      </p>
                      <p className="mono truncate text-[12px] text-muted-foreground">
                        {created.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <span className="mono hidden w-16 shrink-0 text-right text-sm font-semibold tabular-nums md:block">
                      {totalQty || "—"}
                    </span>
                    <div className="hidden w-32 shrink-0 md:block">
                      <Status status={status} />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                );
              })}
            </Panel>
          </div>
        )}
      </PageShell>
    </div>
  );
}
