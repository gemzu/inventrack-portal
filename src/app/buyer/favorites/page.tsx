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
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Favorites
              </span>
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </p>
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
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Heart className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Browse the catalog and tap the heart to save items for later.
            </p>
            <Link href="/buyer/catalog">
              <Button size="lg">Browse catalog</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {it.displayName || it.modelId || "Item"}
                    </div>
                    {it.brand ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {it.brand}
                      </div>
                    ) : null}
                    {it.barcode ? (
                      <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
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
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" />
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemove(it.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
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