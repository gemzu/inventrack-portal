"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getInventoryPaginated, getMyStorefronts } from "@/lib/dataService";
import { Package, ShoppingCart, Search, Tag, X, Sparkles, Store, Plus } from "lucide-react";
import { useToast } from "@/components/Toast";

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

interface Storefront {
  id?: string;
  name?: string;
  orgId?: string;
}

export default function BuyerCatalogPage() {
  const { user } = useAuth();
  const { addToCart, count: cartCount } = useCart();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [currentStorefront, setCurrentStorefront] = useState<Storefront | null>(null);

  const loadItems = async (sf: Storefront) => {
    if (!sf?.orgId) return;
    setLoading(true);
    try {
      const res = await getInventoryPaginated(sf.orgId, { status: "available" }, 0, 500);
      const loaded = (res.items || []) as unknown as Item[];
      setItems(loaded);
      const cats = [...new Set(loaded.map((i) => i.category).filter(Boolean))] as string[];
      setAllCategories(cats);
    } catch (e) {
      toast((e as Error).message || "Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const my = await getMyStorefronts(user.id);
        const sfs = (my as Array<{ storefront?: Storefront }>).map((s) => s.storefront).filter(Boolean) as Storefront[];
        setStorefronts(sfs);
        if (sfs.length > 0) {
          setCurrentStorefront(sfs[0]);
          await loadItems(sfs[0]);
        } else {
          setLoading(false);
        }
      } catch (e) {
        toast((e as Error).message || "Failed to load", "error");
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((it) =>
        [it.displayName, it.modelId, it.brand, it.barcode].some((v) =>
          String(v || "").toLowerCase().includes(s)
        )
      );
    }
    if (categoryFilter) result = result.filter((it) => it.category === categoryFilter);
    return result;
  }, [items, search, categoryFilter]);

  const handleAddToCart = async (item: Item) => {
    setAdding(item.id);
    try {
      await addToCart(
        {
          id: item.id,
          modelId: item.modelId || "",
          barcode: item.barcode || "",
          displayName: item.displayName || "",
          storefrontId: currentStorefront?.id ?? null,
        },
        1
      );
      toast(`Added "${item.displayName || item.modelId}" to cart`, "success");
    } catch (e) {
      toast((e as Error).message || "Failed", "error");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/5" />
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-6">
          {/* Storefront switcher */}
          {storefronts.length > 0 && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
              {storefronts.map((sf) => {
                const isActive = sf.id === currentStorefront?.id;
                return (
                  <button
                    key={sf.id}
                    onClick={async () => {
                      setCurrentStorefront(sf);
                      setCategoryFilter(null);
                      await loadItems(sf);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    {sf.name || "Storefront"}
                  </button>
                );
              })}
              <Link
                href="/buyer/catalog/connect"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Add storefront
              </Link>
            </div>
          )}

          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Catalog</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {currentStorefront?.name
                  ? `Browsing ${currentStorefront.name}`
                  : "Connect a storefront to browse products"}
                {!loading && items.length > 0 && ` · ${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Link href="/buyer/cart" className="relative group">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center border border-border hover:border-primary/50 transition-all duration-200 group-hover:scale-105">
                <ShoppingCart className="w-5 h-5 text-foreground" />
              </div>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Search + category row */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products, brands, barcodes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-10 text-sm bg-background border border-border rounded-xl focus:border-primary transition-all placeholder:text-muted-foreground text-foreground"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {allCategories.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all duration-200 ${
                    !categoryFilter
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  All
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all duration-200 ${
                      categoryFilter === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* No storefront */}
        {storefronts.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <Store className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No storefront connected</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Connect to a storefront using an invite code to start browsing their inventory.
            </p>
            <Link
              href="/buyer/catalog/connect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Connect a storefront
            </Link>
          </div>
        ) : loading ? (
          /* Skeleton grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-children">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="card-luxury overflow-hidden">
                <div className="aspect-[4/3] bg-secondary animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                  <div className="h-9 bg-secondary rounded-xl animate-pulse mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <Package className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No items found</h2>
            <p className="text-muted-foreground">
              {search ? `No results for "${search}"` : "No available items in this storefront."}
            </p>
            {(search || categoryFilter) && (
              <button
                onClick={() => { setSearch(""); setCategoryFilter(null); }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-children">
            {filtered.map((item) => {
              const isAdding = adding === item.id;
              return (
                <div
                  key={item.id}
                  className="card-luxury overflow-hidden hover-lift group"
                >
                  {/* Product image / placeholder */}
                  <div className="aspect-[4/3] relative bg-secondary overflow-hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.displayName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Stock badge */}
                    {item.quantity != null && item.quantity > 0 && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-success/90 text-white backdrop-blur-sm">
                        {item.quantity} in stock
                      </div>
                    )}

                    {/* Category chip */}
                    {item.category && (
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-card/90 text-muted-foreground backdrop-blur-sm border border-border">
                        <Tag className="w-2.5 h-2.5" />
                        {item.category}
                      </div>
                    )}

                    {/* Quick-add overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-foreground/5 backdrop-blur-[1px]">
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={isAdding}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAdding ? "Adding…" : "Quick Add"}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground text-sm truncate leading-tight">
                      {item.displayName || item.modelId || "Item"}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground truncate">
                        {item.brand || item.barcode?.slice(0, 10) || "—"}
                      </span>
                      {item.costPrice != null && (
                        <span className="text-xs font-bold text-primary">
                          ${item.costPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Add to cart */}
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={isAdding}
                      className={`w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isAdding
                          ? "bg-secondary text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {isAdding ? "Adding…" : "Add to cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
