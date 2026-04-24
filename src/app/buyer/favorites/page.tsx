"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getFavorites, toggleFavorite } from "@/lib/dataService";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Package, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface FavItem {
  id: string;
  modelId?: string;
  barcode?: string;
  displayName?: string;
  brand?: string;
  storefrontId?: string | null;
}

export default function BuyerFavoritesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getFavorites("", user.id)
      .then((rows) => setItems(rows as unknown as FavItem[]))
      .catch((e) => toast((e as Error).message || "Failed to load favorites", "error"))
      .finally(() => setLoading(false));
  }, [user, toast]);

  const onRemove = async (id: string) => {
    if (!user) return;
    try {
      await toggleFavorite(id, user.id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast("Removed from favorites", "success");
    } catch (e) {
      toast((e as Error).message || "Failed", "error");
    }
  };

  const onAddToCart = (it: FavItem) => {
    addToCart({
      id: it.id,
      modelId: it.modelId,
      barcode: it.barcode,
      displayName: it.displayName,
      storefrontId: it.storefrontId ?? null,
    });
    toast("Added to cart", "success");
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
              <Heart className="w-5 h-5" style={{ color: '#E398CA' }} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#1f1a1d' }}>Favorites</h1>
          </div>
          <p className="mt-2 text-lg" style={{ color: '#666' }}>{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/50 flex items-center justify-center" style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <Heart className="w-12 h-12 opacity-40" style={{ color: '#E398CA' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1f1a1d' }}>No favorites yet</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Browse the catalog and tap the heart to save items for later.
            </p>
            <Link href="/buyer/catalog">
              <Button size="lg" style={{ background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' }}>
                Browse catalog
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="group bg-white rounded-2xl p-5 hover:shadow-xl transition-all duration-300"
                style={{ boxShadow: '0 2px 15px rgba(0,0,0,0.05)' }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                    <Package className="w-5 h-5" style={{ color: '#E398CA' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate" style={{ color: '#1f1a1d' }}>
                      {it.displayName || it.modelId || "Item"}
                    </div>
                    {it.brand ? (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {it.brand}
                      </div>
                    ) : null}
                    {it.barcode ? (
                      <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
                        {it.barcode}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onAddToCart(it)}
                    style={{ background: '#E398CA' }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" /> Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemove(it.id)}
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}