"use client";

/**
 * Theme state.
 *
 * This used to *decide* the theme, in an effect: read localStorage, work out
 * the preference, then add the `dark` class. Effects run after hydration, and
 * hydration runs after the first paint — so every load painted light and then
 * flipped. On a dark theme that is a white screen for the length of hydration,
 * which is the most visible flaw a site can have and was showing up as "the
 * first third of a second looks wrong".
 *
 * The decision moved into BootScript, which runs during parse, before anything
 * is painted. What is left here is state that follows the DOM rather than
 * leading it: read what the class already says, and own the writes when
 * somebody flips a switch.
 */

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
  /* Starts light to match what the server rendered, then syncs to whatever the
     pre-paint script already put on <html>. Nothing visual depends on this —
     the class is the source of truth for the paint; this is only so the theme
     toggle draws the right icon. */
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccentState] = useState<Accent>("neutral");

  useEffect(() => {
    const el = document.documentElement;
    setTheme(el.classList.contains("dark") ? "dark" : "light");
    setAccentState(el.classList.contains("pink-accent") ? "pink" : "neutral");
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("inventrack-theme", next);
    } catch {
      /* Private mode. The choice just will not survive the tab. */
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const setAccent = (next: Accent) => {
    setAccentState(next);
    try {
      localStorage.setItem("inventrack-accent", next);
    } catch {
      /* As above. */
    }
    document.documentElement.classList.toggle("pink-accent", next === "pink");
  };

  return (
    <ThemeContext.Provider value={{ theme, accent, toggleTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
