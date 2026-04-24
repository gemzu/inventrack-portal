"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  id: string;
  modelId?: string;
  barcode?: string;
  displayName?: string;
  quantity: number;
  storefrontId?: string | null;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = "inventrack_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextType>(() => ({
    items,
    count: items.reduce((acc, it) => acc + it.quantity, 0),
    addToCart: (item, qty = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === item.id);
        if (idx === -1) return [...prev, { ...item, quantity: Math.max(1, qty) }];
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + Math.max(1, qty) };
        return next;
      });
    },
    removeFromCart: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
    updateQuantity: (id, qty) =>
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, qty) } : p))),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

