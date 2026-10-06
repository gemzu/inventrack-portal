"use client";

import { itemIdentity } from "@/lib/itemIdentity";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createOrder, holdUnits, releaseHold } from "@/lib/dataService";
import type { CartItem } from "@/context/CartContext";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Figure, ColHead } from "@/components/console/surfaces";
import { Action } from "@/components/console/controls";

export default function BuyerCartPage() {
  const { user, userName } = useAuth();
  const { items, updateQuantity, removeFromCart, clearCart, count } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const totalQty = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);

  /* One order per supplier, placed the way the app places it: each item's
     units are held first, and the order points at the held units - which is
     what lets the supplier approve it, and stops the same units being sold
     twice. This used to send nothing for most buyers (it needed an
     organization of the buyer's own) and, for the rest, an order with no
     store and no units behind it, which the database refuses. */
  const handleSubmit = async () => {
    if (!user) return;
    const groups = new Map<string, CartItem[]>();
    for (const it of items) {
      if (!it.storefrontId || !it.orgId) continue;
      groups.set(it.storefrontId, [...(groups.get(it.storefrontId) || []), it]);
    }
    if (groups.size === 0) {
      toast("Add these items again from the catalog - they are missing their supplier.", "error");
      return;
    }
    setSubmitting(true);
    let held: string[] = [];
    let sent = 0;
    try {
      for (const [storefrontId, group] of groups) {
        const lines = [];
        for (const it of group) {
          const row = (await holdUnits(it.id, it.quantity, storefrontId)) as Record<string, unknown>;
          held.push(String(row.id));
          lines.push({
            inventoryId: row.id,
            displayName: (row.displayName as string) ?? it.displayName ?? null,
            modelId: (row.modelId as string) ?? it.modelId ?? null,
            brand: (row.brand as string) ?? null,
            barcode: (row.barcode as string) ?? it.barcode ?? null,
            partNumber: (row.partNumber as string) ?? null,
            category: (row.category as string) ?? null,
            quantity: it.quantity,
          });
        }
        const name = userName || user.email || "Buyer";
        await createOrder(String(group[0].orgId), {
          buyerId: user.id,
          buyerName: name,
          buyerEmail: user.email || "",
          orderName: `Order from ${name}`,
          storefrontId,
          items: lines,
          totalQty: group.reduce((acc, i) => acc + i.quantity, 0),
          status: "pending_approval",
        });
        /* Those units now belong to a placed order. */
        held = [];
        sent += 1;
        group.forEach((it) => removeFromCart(it.id));
      }
      toast(sent > 1 ? `${sent} orders sent` : "Order sent", "success");
      router.push("/buyer/orders");
    } catch (e) {
      /* Give back whatever was held for the order that did not go out. */
      await Promise.all(held.map((id) => releaseHold(id).catch(() => {})));
      toast((e as Error).message || "That order did not go through.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title="Cart"
        eyebrow="Buying"
        subtitle="What goes out when you send this. Nothing is reserved until it does."
      >
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Cart is empty"
            description="Add something from the catalog and it collects here."
            actionLabel="Browse the catalog"
            onAction={() => router.push("/buyer/catalog")}
          />
        ) : (
          <div className="space-y-8">
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label="Lines" value={count} />
              <Figure label="Units" value={totalQty} />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <Panel className="reveal lg:col-span-2">
                <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                  <ColHead className="min-w-0 flex-1">Item</ColHead>
                  <ColHead className="w-32 shrink-0 text-center">Quantity</ColHead>
                  <span className="w-8 shrink-0" />
                </div>

                {items.map((item) => {
                  const id = itemIdentity(item);
                  return (
                    <div key={item.id} className="row-line group flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                          {id.title}
                        </p>
                        {id.subtitle && (
                          <p className="truncate text-[12px] text-muted-foreground">
                            {id.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Two hairline buttons and the number between them.
                          A filled stepper block was the only place in the
                          product with that shape. */}
                      <div className="flex w-32 shrink-0 items-center justify-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          aria-label={`One fewer ${id.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-[border-color,color] duration-300 hover:border-[var(--brand-2)] hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`One more ${id.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-[border-color,color] duration-300 hover:border-[var(--brand-2)] hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${id.title}`}
                        className="w-8 shrink-0 text-muted-foreground opacity-0 transition-[opacity,color] duration-300 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </Panel>

              <div className="lg:col-span-1">
                <div className="panel panel-live reveal d1 sticky top-20 p-6">
                  <p className="text-[12px] tracking-[0.2em] text-muted-foreground">
                    Sending
                  </p>
                  <p className="figure-value mt-3">{totalQty}</p>
                  <p className="figure-label mt-2">
                    units over {count} {count === 1 ? "line" : "lines"}
                  </p>

                  <div className="mt-6 space-y-3 border-t border-border pt-5">
                    <Action solid onClick={handleSubmit} disabled={submitting} className="w-full">
                      {submitting ? "Sending" : "Send order"}
                      {!submitting && <ArrowRight className="h-3.5 w-3.5" />}
                    </Action>
                    <Action onClick={clearCart} className="w-full">
                      Empty the cart
                    </Action>
                  </div>

                  <Link
                    href="/buyer/catalog"
                    className="mt-5 block text-center text-[12px] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    Keep shopping
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}
