import { Variants } from "framer-motion";

/**
 * Motion tokens. Standardized reveal patterns — every animated section uses
 * one of these via `whileInView` + the relevant variant.
 *
 * Replaces the 3 competing idioms that previously coexisted:
 *   1. variants + animate (on mount)
 *   2. inline initial/whileInView
 *   3. useInView hook + conditional animate
 */

export const EASE_OUT_QUART = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_QUART },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE_OUT_QUART } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_OUT_QUART },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

// Standard viewport config — use with whileInView.
export const viewportOnce = { once: true, margin: "-80px" } as const;

// Legacy aliases — keep so older components don't break during migration.
export const fadeUpStagger = fadeUp;
export const containerVariants = staggerContainer;
