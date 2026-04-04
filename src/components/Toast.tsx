"use client";

import { Toaster, toast as sonnerToast } from "sonner";
import { createContext, useContext } from "react";

const ToastContext = createContext<{ toast: (msg: string, type?: "success" | "error" | "info") => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = (message: string, type?: "success" | "error" | "info") => {
    if (type === "error") sonnerToast.error(message);
    else if (type === "success") sonnerToast.success(message);
    else sonnerToast.info(message);
  };
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster position="bottom-right" richColors />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
