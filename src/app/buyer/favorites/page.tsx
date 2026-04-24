"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getFavorites, toggleFavorite } from "@/lib/dataService";
import { useCart } from "@/context/CartContext";
import { Heart, Package, ShoppingCart, Trash2, ShoppingBag } from "lucide-react";
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
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !orgId) return;
    setLoading(true);
    getFavorites(orgId, user.id)
      .then((rows) => setItems(rows as unknown as FavItem[]))
      .catch((e) => toast((e as Error).message || "Failed to load favorites", "error"))
      .finally(() => setLoading(false));
  }, [user, orgId, toast]);

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
    toast(`Added "${it.displayName || it.modelId}" to cart`, "success");
  };

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary/30" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Favorites</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            {loading ? "Loading…" : `${items.length} saved item${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-luxury p-5 h-36 animate-pulse bg-secondary/50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <Heart className="w-9 h-9 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Browse the catalog and save items you love to find them here.
            </p>
            <Link
              href="/buyer/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse catalog
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {items.map((it) => (
              <div
                key={it.id}
                className="card-luxury p-5 hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground text-sm truncate">
                      {it.displayName || it.modelId || "Item"}
                    </div>
                    {it.brand && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{it.brand}</div>
                    )}
                    {it.barcode && (
                      <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {it.barcode}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onAddToCart(it)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to cart
                  </button>
                  <button
                    onClick={() => onRemove(it.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
