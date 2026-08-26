"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Owns the page-to-page transition for the whole dashboard. `template.tsx`
 * remounts on every navigation, so this single Framer Motion entrance gives a
 * consistent transition across all pages.
 *
 * IMPORTANT: fade ONLY — no transform/filter/scale. Framer leaves those styles
 * inline even at rest (translateY(0) / blur(0px)), and any non-`none` transform
 * or filter on this wrapper makes every `position: fixed` drawer/modal inside
 * the dashboard anchor to THIS box instead of the viewport — pinning them to the
 * top of the page. Keep this purely opacity.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
