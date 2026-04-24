"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, ShoppingBag } from "lucide-react";
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
      // All cart items are expected to come from the same storefront for now.
      // Pick the first non-null storefrontId as the order's storefront.
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
      toast("Order submitted", "success");
      router.push("/buyer/orders");
    } catch (e) {
      toast((e as Error).message || "Failed to submit order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Cart
            </span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {count} item{count !== 1 ? "s" : ""} ready to order
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add items from the catalog to get started.</p>
            <Link href="/buyer/catalog">
              <Button size="lg">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Browse Catalog
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative bg-card border border-border rounded-2xl p-4 hover:border-primary/50 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{item.displayName || item.modelId || "Item"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.barcode || ""}</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold">Order Summary</h2>
                
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-semibold">{totalQty}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 text-lg"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="animate-pulse">Submitting...</span>
                    ) : (
                      <>
                        Submit Order
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </Button>
                </div>

                <Link href="/buyer/catalog" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                  Continue Shopping →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}