/**
 * Kinetic Ink — shared motion vocabulary for the portal.
 * One spring, one set of easings, reused everywhere so the whole app
 * moves as a single system. Framer Motion variants + transitions.
 */
import type { Variants, Transition } from "framer-motion";

/* Signature spring — snappy but soft. Used for hovers, layout, entrances. */
export const spring: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 30 };
export const ease = [0.16, 1, 0.3, 1] as const; // expo-out

/* Page / section entrance: gentle rise + fade. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring },
};

/* Parent that reveals children one after another. */
export const stagger = (delay = 0, gap = 0.06): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: delay, staggerChildren: gap } },
});

/* Child item to pair with `stagger` on the parent. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

/* Hover lift for interactive cards. */
export const hoverLift = {
  whileHover: { y: -4, transition: spring },
  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
};
