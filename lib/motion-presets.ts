/**
 * Motion Presets — Shared animation variants for framer-motion
 * 
 * Consolidates 12+ duplicate definitions of containerVariants/itemVariants from:
 * - app/badges, dashboard, vault, vault/recover, benefits, treasury, merchant pages
 * - components/notifications, components/performance
 * 
 * MIGRATION: Replace all inline `const containerVariants = {...}` with:
 *   import { containerVariants, itemVariants } from '@/lib/motion-presets';
 * 
 * Or use named presets:
 *   import { stagger, fadeSlideUp, scaleIn } from '@/lib/motion-presets';
 */

import type { Variants } from 'framer-motion';

// ── Standard stagger container ──────────────────────────────────────────────
// Parent container that staggers children on mount
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
} as const;

// ── Standard item (fade + slide up with spring) ─────────────────────────────
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100 },
  },
};

// ── Named presets for specific use cases ─────────────────────────────────────

/** Fast stagger (0.08s between children) — used in vault/recover */
export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

/** Slow stagger (0.15s between children) — used in merchant landing pages */
export const staggerSlow: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

/** Fade + slide up with spring damping — used in vault/recover items */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

/** Scale in from 0.8 — used in merchant feature cards */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

/** Simple fade — no movement */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

/** Slide in from right — used in tab transitions */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/** Slide in from left — used in back navigation */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/** Pop up from bottom — used in modals and notifications */
export const popUp: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

// ── Utility: create a custom stagger container ──────────────────────────────
export function createStagger(interval: number, delay = 0): Variants {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: interval, delayChildren: delay },
    },
  };
}
