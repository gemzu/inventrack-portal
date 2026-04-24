"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Theme = "light" | "dark";
type Accent = "neutral" | "pink";

interface ThemeContextType {
  theme: Theme;
  accent: Accent;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  accent: "neutral",
  toggleTheme: () => {},
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccentState] = useState<Accent>("neutral");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("inventrack-theme") as Theme | null;
    const savedAccent = localStorage.getItem("inventrack-accent") as Accent | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    
    const t = savedTheme || preferred;
    const a = savedAccent || "neutral";
    
    setTheme(t);
    setAccentState(a);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.classList.toggle("pink-accent", a === "pink");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("inventrack-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const setAccent = (newAccent: Accent) => {
    setAccentState(newAccent);
    localStorage.setItem("inventrack-accent", newAccent);
    document.documentElement.classList.toggle("pink-accent", newAccent === "pink");
  };

  return (
    <ThemeContext.Provider value={{ theme, accent, toggleTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);