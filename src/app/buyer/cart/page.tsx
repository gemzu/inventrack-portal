"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/dataService";
import {
  ShoppingCart, Trash2, Plus, Minus,
  ArrowRight, Package, ShoppingBag,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function BuyerCartPage() {
  const { user, orgId, userName } = useAuth();
  const { items, updateQuantity, removeFromCart, clearCart, count } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const totalQty = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);

  const handleSubmit = async () => {
    if (!orgId || !user) return;
    try {
      setSubmitting(true);
      const storefrontId = items.find((i) => i.storefrontId)?.storefrontId ?? null;
      await createOrder(orgId, {
        buyerId: user.id,
        buyerName: userName || user.email || "Buyer",
        buyerEmail: user.email || "",
        storefrontId,
        items: items.map((i) => ({
          modelId: i.modelId,
          barcode: i.barcode,
          displayName: i.displayName,
          quantity: i.quantity,
        })),
        totalQty,
        status: "pending_approval",
      });
      clearCart();
      toast("Order submitted successfully!", "success");
      router.push("/buyer/orders");
    } catch (e) {
      toast((e as Error).message || "Failed to submit order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Cart</h1>
              <p className="text-sm text-muted-foreground">
                {count} item{count !== 1 ? "s" : ""} · {totalQty} unit{totalQty !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <ShoppingCart className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add items from the catalog to get started.</p>
            <Link
              href="/buyer/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse catalog
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-2 stagger-children">
              {items.map((item) => (
                <div key={item.id} className="card-luxury p-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm truncate">
                        {item.displayName || item.modelId || "Item"}
                      </div>
                      {item.barcode && (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {item.barcode}
                        </div>
                      )}
                    </div>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-card text-foreground transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-card text-foreground transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-1 flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Clear all items
              </button>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="card-luxury p-6 sticky top-6 space-y-5">
                <h2 className="font-bold text-foreground text-base">Order summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products</span>
                    <span className="text-foreground font-medium">{count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total units</span>
                    <span className="text-foreground font-bold text-base">{totalQty}</span>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground text-xs">After submit</span>
                      <span className="text-[10px] font-semibold text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Pending approval
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="animate-pulse">Submitting…</span>
                  ) : (
                    <>
                      Submit order
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/buyer/catalog"
                  className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Continue shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
