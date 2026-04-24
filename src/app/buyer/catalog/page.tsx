"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getInventoryPaginated, getMyStorefronts } from "@/lib/dataService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Search, Tag, Box, X } from "lucide-react";
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

export default function BuyerCatalogPage() {
  const { user } = useAuth();
  const { addToCart, items: cartItems } = useCart();
  const { toast } = useToast();
  
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

  const storefront = (storefronts[0] as Record<string, unknown> | undefined)?.storefront as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, var(--primary) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, var(--primary) 0%, transparent 40%)`,
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Catalog
                </span>
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                {filtered.length} items available
                {storefront && <span className="mx-2">·</span>}
                {storefront && <span className="text-primary">{String(storefront.name || "Storefront")}</span>}
              </p>
            </div>
            <Link href="/buyer/cart">
              <Button size="lg" className="relative">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, model, brand, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {storefronts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Box className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No storefront connected</h2>
            <p className="text-muted-foreground mb-6">Connect to a storefront to view inventory.</p>
            <Link href="/buyer/catalog/connect">
              <Button size="lg">Connect Storefront</Button>
            </Link>
          </div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-2xl" />
                <div className="h-4 bg-muted mt-3 rounded w-3/4" />
                <div className="h-3 bg-muted mt-2 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mt-4">No items found</h2>
            <p className="text-muted-foreground">Try adjusting your search.</p>
          </div>
        ) : (
          <>
            {/* Categories Filter */}
            {allCategories.length > 0 && (
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    !categoryFilter 
                      ? "bg-foreground text-background" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      categoryFilter === cat
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Items Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Image */}
                  <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-16 h-16 text-muted-foreground/30" />
                    )}
                    
                    {/* Quantity Badge */}
                    {item.quantity !== undefined && item.quantity > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-success/90 text-white text-xs font-bold rounded-full">
                        {item.quantity} in stock
                      </div>
                    )}
                    
                    {/* Category Tag */}
                    {item.category && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium">
                        <Tag className="w-3 h-3" />
                        {item.category}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {item.displayName || item.modelId || "Unnamed Item"}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{item.barcode}</span>
                      <span>{item.brand || "—"}</span>
                    </div>

                    {/* Price */}
                    {item.costPrice !== undefined && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-lg font-bold text-primary">
                          ${item.costPrice.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Add Button */}
                    <Button 
                      className="w-full mt-3" 
                      onClick={() => handleAddToCart(item)}
                      disabled={adding === item.id}
                    >
                      {adding === item.id ? (
                        <span className="animate-pulse">Adding...</span>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}