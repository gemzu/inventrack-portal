"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const borderColors: Record<ToastType, string> = {
  success: "#16a34a",
  error: "#dc2626",
  info: "#2563eb",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.length > 3 ? next.slice(-3) : next;
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      className="pointer-events-auto glass-card flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-sm animate-slide-in-right"
      style={{ borderLeft: `4px solid ${borderColors[item.type]}` }}
    >
      <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>
        {item.message}
      </span>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
      >
        <X className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
      </button>
    </div>
  );
}
