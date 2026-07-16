"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Owns the page-to-page transition for the whole dashboard. `template.tsx`
 * remounts on every navigation, so this single Framer Motion entrance gives a
 * consistent, obvious, premium transition across all pages.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(6px)", scale: 0.985 }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
