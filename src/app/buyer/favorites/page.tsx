"use client";

import { itemIdentity } from "@/lib/itemIdentity";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getFavorites, toggleFavorite } from "@/lib/dataService";
import { useCart } from "@/context/CartContext";
import { Heart, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Panel, Figure, ListSkeleton } from "@/components/console/surfaces";

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
  const router = useRouter();
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
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title="Saved"
        eyebrow="Buying"
        subtitle="Things you kept for later. Saving one does not hold any stock."
      >
        {loading ? (
          <ListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved"
            description="Tap the heart on anything in the catalog and it waits here."
            actionLabel="Browse the catalog"
            onAction={() => router.push("/buyer/catalog")}
          />
        ) : (
          <div className="space-y-8">
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label="Saved" value={items.length} />
            </div>

            <Panel className="reveal">
              {items.map((it) => {
                const id = itemIdentity(it);
                return (
                  <div key={it.id} className="row-line group flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                        {id.title}
                      </p>
                      <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {[id.subtitle, it.brand].filter(Boolean).join(" · ") || "No detail"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <button
                        onClick={() => onAddToCart(it)}
                        className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--brand-2)] transition-colors duration-300 hover:text-foreground"
                      >
                        Add to cart
                      </button>
                      <button
                        onClick={() => onRemove(it.id)}
                        aria-label={`Unsave ${id.title}`}
                        className="text-muted-foreground opacity-0 transition-[opacity,color] duration-300 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </Panel>
          </div>
        )}
      </PageShell>
    </div>
  );
}
