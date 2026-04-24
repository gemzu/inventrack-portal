"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getInventoryPaginated, getMyStorefronts } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Search, Tag, X, Sparkles } from "lucide-react";
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
  const [storefronts, setStorefronts] = useState<Array<{storefront?: {id?: string, name?: string, orgId?: string}}>>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [currentStorefront, setCurrentStorefront] = useState<{id?: string, name?: string, orgId?: string} | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const my = await getMyStorefronts(user.id);
        setStorefronts(my as typeof storefronts);
        
        if (my && my.length > 0) {
          const sf = (my[0] as {storefront?: {id?: string, name?: string, orgId?: string}})?.storefront;
          setCurrentStorefront(sf || null);
          
          if (sf?.orgId) {
            const res = await getInventoryPaginated(sf.orgId, { status: "available" }, 0, 500);
            const loadedItems = (res.items || []) as unknown as Item[];
            setItems(loadedItems);
            const cats = [...new Set(loadedItems.map((i) => i.category).filter(Boolean))] as string[];
            setAllCategories(cats);
          }
        }
      } catch (e) {
        toast((e as Error).message || "Failed to load", "error");
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
    if (categoryFilter) result = result.filter((it) => it.category === categoryFilter);
    return result;
  }, [items, search, categoryFilter]);

  const handleAddToCart = async (item: Item) => {
    setAdding(item.id);
    try {
      await addToCart({ id: item.id, modelId: item.modelId || "", barcode: item.barcode || "", displayName: item.displayName || "", storefrontId: currentStorefront?.id ?? null }, 1);
      toast(`Added ${item.displayName || item.modelId}`, "success");
    } catch (e) {
      toast((e as Error).message || "Failed", "error");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {storefronts.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {storefronts.map((sf, idx) => {
                const s = sf.storefront;
                const isActive = s?.id === currentStorefront?.id;
                return (
                  <button
                    key={s?.id || idx}
                    onClick={async () => {
                      setCurrentStorefront(s || null);
                      if (s?.orgId) {
                        const res = await getInventoryPaginated(s.orgId, { status: "available" }, 0, 500);
                        setItems((res.items || []) as unknown as Item[]);
                        const cats = [...new Set((res.items || []).map((i) => (i as unknown as Item).category).filter(Boolean))];
                        setAllCategories(cats as string[]);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${isActive ? 'text-white' : 'text-gray-600'}`}
                    style={isActive ? { background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' } : { background: 'rgba(255,255,255,0.6)' }}
                  >
                    {s?.name || `Storefront ${idx + 1}`}
                  </button>
                );
              })}
              <Link href="/buyer/catalog/connect" className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 text-gray-400" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <Sparkles className="w-3 h-3" /> Add
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#1f1a1d' }}>Catalog</h1>
              <p className="opacity-70 mt-1">{filtered.length} items available</p>
            </div>
            <Link href="/buyer/cart">
              <button className="relative p-3 rounded-full bg-white shadow-md hover:shadow-lg transition-all" style={{ boxShadow: '0 4px 15px rgba(227,152,202,0.3)' }}>
                <ShoppingCart className="w-5 h-5" style={{ color: '#E398CA' }} />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
            </Link>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-10 rounded-2xl border-0 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-[#E398CA]/50 transition-all"
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        {storefronts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/50 flex items-center justify-center">
              <Package className="w-12 h-12 opacity-40" style={{ color: '#E398CA' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1f1a1d' }}>No storefront connected</h2>
            <p className="opacity-60 mb-6">Connect to a storefront to browse their inventory.</p>
            <Link href="/buyer/catalog/connect">
              <Button style={{ background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' }}>Connect Storefront</Button>
            </Link>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-white/50 rounded-2xl" />
                <div className="h-4 bg-white/50 mt-3 rounded w-3/4" />
                <div className="h-3 bg-white/30 mt-2 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto opacity-30" style={{ color: '#E398CA' }} />
            <h2 className="text-xl font-semibold mt-4">No items found</h2>
            <p className="opacity-60">Try adjusting your search.</p>
          </div>
        ) : (
          <>
            {allCategories.length > 1 && (
              <div className="flex items-center gap-2 mb-6 overflow-x-auto">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${!categoryFilter ? 'text-white' : 'text-gray-600'}`}
                  style={!categoryFilter ? { background: '#E398CA' } : { background: 'rgba(255,255,255,0.6)' }}
                >
                  All
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${categoryFilter === cat ? 'text-white' : 'text-gray-600'}`}
                    style={categoryFilter === cat ? { background: '#E398CA' } : { background: 'rgba(255,255,255,0.6)' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item, index) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
                  style={{ boxShadow: '0 2px 15px rgba(0,0,0,0.05)' }}
                >
                  <div className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 opacity-20" style={{ color: '#E398CA' }} />
                      </div>
                    )}
                    {item.quantity !== undefined && item.quantity > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#22c55e' }}>
                        {item.quantity}
                      </div>
                    )}
                    {item.category && (
                      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-600">
                        <Tag className="w-3 h-3 inline mr-1" />{item.category}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 truncate text-sm">{item.displayName || item.modelId || "Item"}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span className="font-mono">{item.barcode?.slice(0, 8) || "—"}</span>
                      <span>{item.brand || "—"}</span>
                    </div>
                    {item.costPrice !== undefined && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-lg font-bold" style={{ color: '#E398CA' }}>${item.costPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <button 
                      onClick={() => handleAddToCart(item)}
                      disabled={adding === item.id}
                      className="w-full mt-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                      style={adding === item.id ? { background: '#fcd9e6', color: '#E398CA' } : { background: '#E398CA', color: 'white' }}
                    >
                      {adding === item.id ? "Adding..." : <><ShoppingCart className="w-4 h-4" /> Add to Cart</>}
                    </button>
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