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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#1f1a1d' }}>Cart</h1>
          <p className="mt-2 text-lg" style={{ color: '#666' }}>{count} item{count !== 1 ? "s" : ""} ready to order</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/50 flex items-center justify-center" style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <ShoppingCart className="w-12 h-12 opacity-40" style={{ color: '#E398CA' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1f1a1d' }}>Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add items from the catalog to get started.</p>
            <Link href="/buyer/catalog">
              <Button size="lg" style={{ background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' }}>
                <ShoppingBag className="w-5 h-5 mr-2" /> Browse Catalog
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
                  className="group bg-white rounded-2xl p-4 hover:shadow-xl transition-all duration-300"
                  style={{ 
                    boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: '#1f1a1d' }}>
                        {item.displayName || item.modelId || "Item"}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{item.barcode || ""}</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-3 py-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                          style={item.quantity === 1 ? { background: '#fcd9e6', color: '#E398CA' } : { background: 'white', color: '#E398CA' }}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold" style={{ color: '#1f1a1d' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#fce4ec] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
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
              <div className="sticky top-6 bg-white border border-gray-200 rounded-2xl p-6 space-y-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 className="text-xl font-bold" style={{ color: '#1f1a1d' }}>Order Summary</h2>
                
                <div className="space-y-2 border-b border-gray-200 pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium" style={{ color: '#1f1a1d' }}>{count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Quantity</span>
                    <span className="font-medium" style={{ color: '#1f1a1d' }}>{totalQty}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 text-lg"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={submitting ? { background: '#fcd9e6', color: '#E398CA' } : { background: '#E398CA', color: 'white' }}
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
                    className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </Button>
                </div>

                <Link href="/buyer/catalog" className="block text-center text-sm text-gray-500 hover:text-[#E398CA]">
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