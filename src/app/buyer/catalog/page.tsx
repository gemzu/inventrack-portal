"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getInventoryPaginated, getMyStorefronts } from "@/lib/dataService";
import { Package, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/Toast";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { Figure, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Chip, SearchInput } from "@/components/console/controls";

interface Item {
  id: string;
  modelId: string;
  barcode: string;
  displayName?: string;
  brand?: string;
  category?: string;
  quantity?: number;
  imageUrl?: string;
  costPrice?: number;
}

export default function BuyerCatalogPage() {
  const { user } = useAuth();
  const { addToCart, items: cartItems } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [storefronts, setStorefronts] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const [allCategories, setAllCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const my = await getMyStorefronts(user.id);
        setStorefronts(my as Record<string, unknown>[]);
        const first = (my?.[0] as Record<string, unknown> | undefined) || undefined;
        const sf = (first?.storefront as Record<string, unknown> | undefined) || undefined;
        const orgId = String(sf?.orgId || "");
        if (!orgId) {
          setItems([]);
          return;
        }
        const res = await getInventoryPaginated(orgId, { status: "available" }, 0, 500);
        const loadedItems = (res.items || []) as unknown as Item[];
        setItems(loadedItems);
        
        // Extract unique categories from items
        const cats = [...new Set(loadedItems.map((i) => i.category).filter(Boolean))];
        setAllCategories(cats as string[]);
      } catch (e) {
        toast((e as Error).message || "Failed to load catalog", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((it) =>
        [it.displayName, it.modelId, it.brand, it.barcode].some((v) => String(v || "").toLowerCase().includes(s))
      );
    }
    if (categoryFilter) {
      result = result.filter((it) => it.category === categoryFilter);
    }
    return result;
  }, [items, search, categoryFilter]);

  const handleAddToCart = async (item: Item) => {
    setAdding(item.id);
    try {
      await addToCart({ 
        id: item.id, 
        modelId: item.modelId || "", 
        barcode: item.barcode || "", 
        displayName: item.displayName || "",
        storefrontId: null 
      }, 1);
      toast(`Added ${item.displayName || item.modelId}`, "success");
    } catch (e) {
      toast((e as Error).message || "Failed to add", "error");
    } finally {
      setAdding(null);
    }
  };

  const storefront = (storefronts[0] as Record<string, unknown> | undefined)?.storefront as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <PageShell
        title="Catalog"
        eyebrow={storefront ? String(storefront.name || "Storefront") : "Buying"}
        subtitle="Everything this supplier is showing you. Adding to the cart reserves nothing until you send the order."
        actions={
          <Link
            href="/buyer/cart"
            className="mono inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2 text-[11px] uppercase tracking-[0.18em] transition-[border-color,color] duration-300 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]"
          >
            <ShoppingCart className="h-3 w-3" />
            Cart
            {cartItems.length > 0 && (
              <span className="tabular-nums text-[var(--brand-2)]">{cartItems.length}</span>
            )}
          </Link>
        }
      >
        {storefronts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Not connected yet"
            description="A supplier gives you a join code. Enter it and their catalog appears here."
            actionLabel="Enter a code"
            onAction={() => router.push("/buyer/catalog/connect")}
          />
        ) : (
          <div className="space-y-8">
            <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <Figure label="Items available" value={filtered.length} />
            </div>

            <div className="space-y-4">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Name, model, brand, or barcode"
                aria-label="Search the catalog"
              />
              {allCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Chip on={!categoryFilter} onClick={() => setCategoryFilter(null)}>
                    Everything
                  </Chip>
                  {allCategories.map((cat) => (
                    <Chip
                      key={cat}
                      on={categoryFilter === cat}
                      onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    >
                      {cat}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <CrateSkeleton key={i} className="h-64 w-full" delay={i * 0.07} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Nothing matches"
                description="Clear the search, or try a different category."
              />
            ) : (
              <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => {
                  const inStock = (item.quantity ?? 0) > 0;
                  return (
                    <div key={item.id} className="panel panel-hover flex h-full flex-col">
                      {/* A photo when there is one; a hairline plate when there
                          is not. A giant grey glyph only says "no photo"
                          louder than the absence already does. */}
                      <div className="aspect-[4/3] overflow-hidden border-b border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.30,1)] hover:scale-[1.03]"
                          />
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <p className="line-clamp-1 text-sm font-medium">
                          {item.displayName || item.modelId || "Unnamed item"}
                        </p>
                        <p className="mono mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {item.barcode}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </p>

                        <div className="mt-3 flex items-baseline justify-between gap-3">
                          {item.costPrice !== undefined ? (
                            <span className="font-display text-lg font-bold tabular-nums tracking-[-0.02em]">
                              ${item.costPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Ask for a price
                            </span>
                          )}
                          <span
                            className={`mono shrink-0 text-[11px] uppercase tracking-[0.14em] ${
                              inStock ? "text-muted-foreground" : "text-warning"
                            }`}
                          >
                            {inStock ? `${item.quantity} on hand` : "None on hand"}
                          </span>
                        </div>

                        <Action
                          solid
                          onClick={() => handleAddToCart(item)}
                          disabled={adding === item.id}
                          className="mt-4 w-full"
                        >
                          {adding === item.id ? "Adding" : "Add to cart"}
                        </Action>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PageShell>
    </div>
  );
}
