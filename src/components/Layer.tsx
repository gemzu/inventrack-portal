"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* Draws its children on top of the whole window, not inside the page.

   Drawers, dialogs and the photo viewer are `position: fixed`, which only
   means "fixed to the window" when nothing above them has a transform,
   filter or backdrop blur. The console's page wrapper and panels do, so the
   item panel opened inside the inventory column and scrolled with it, and a
   photo opened in the middle of the list instead of over the screen
   (reported 2026-10-18). Rendering them at the end of <body> takes them out
   of every such wrapper. The `console` class keeps the console's hairline
   colours, which are defined on that class. */
export default function Layer({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host) return null;
  return createPortal(<div className="console">{children}</div>, host);
}
