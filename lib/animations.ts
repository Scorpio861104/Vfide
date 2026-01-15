/**
 * Shared Animation Module
 * Centralizes framer-motion animation variants to reduce bundle duplication
 * and ensure consistent animations across the application.
 */

import { Variants, Transition, TargetAndTransition } from 'framer-motion';

// ==================== COMMON TRANSITIONS ====================

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};

export const smoothTransition: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};

export const quickTransition: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

export const slowTransition: Transition = {
  duration: 0.5,
  ease: 'easeInOut',
};

// ==================== CONTAINER VARIANTS ====================

/**
 * Staggered container animation - children animate in sequence
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

// ==================== ITEM VARIANTS ====================

/**
 * Fade and slide up animation
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

export const fadeInUpLarge: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

/**
 * Fade and slide down animation
 */
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  show: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

/**
 * Fade and slide from left
 */
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: springTransition,
  },
};

/**
 * Fade and slide from right
 */
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: springTransition,
  },
};

/**
 * Simple fade animation
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: smoothTransition,
  },
};

/**
 * Scale up animation (for buttons, cards)
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

export const scaleInSmall: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: quickTransition,
  },
};

// ==================== LIST ITEM VARIANTS ====================

/**
 * For use in mapped lists with stagger
 */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

export const listItemFromLeft: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

// ==================== MODAL VARIANTS ====================

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: quickTransition,
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: '100%' },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 200 },
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: quickTransition,
  },
};

// ==================== HOVER/TAP ANIMATIONS ====================

export const buttonHover: TargetAndTransition = {
  scale: 1.02,
  transition: quickTransition,
};

export const buttonTap: TargetAndTransition = {
  scale: 0.98,
};

export const cardHover: TargetAndTransition = {
  scale: 1.01,
  y: -2,
  transition: smoothTransition,
};

export const iconHover: TargetAndTransition = {
  scale: 1.1,
  transition: quickTransition,
};

// ==================== SKELETON/LOADING ====================

export const pulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmer: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ==================== NOTIFICATION ANIMATIONS ====================

export const notificationEnter: Variants = {
  hidden: { opacity: 0, x: 50, scale: 0.9 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    x: 50,
    scale: 0.9,
    transition: quickTransition,
  },
};

// ==================== PAGE TRANSITIONS ====================

export const pageEnter: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a stagger delay based on index
 */
export const getStaggerDelay = (index: number, baseDelay = 0.05): number => {
  return index * baseDelay;
};

/**
 * Get animation props for a list item with index-based delay
 */
export const getListItemAnimation = (index: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: getStaggerDelay(index), ...springTransition },
});

// ==================== PHASE 4: WALLET CONNECTION ANIMATIONS ====================

/**
 * Connection state transition animations
 * For smooth transitions between wallet connection states
 */
export const connectionStateAnimations = {
  disconnected: {
    scale: 1,
    opacity: 1,
  },
  connecting: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  connected: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.3,
    },
  },
  error: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
    },
  },
};

/**
 * Success checkmark animation
 * For successful wallet connection
 */
export const successCheck: Variants = {
  hidden: { scale: 0, rotate: -180 },
  show: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
};

/**
 * Shake animation for errors
 * For connection failures or validation errors
 */
export const shake: Variants = {
  animate: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
    },
  },
};

/**
 * Optimistic UI transition
 * For instant feedback before confirmation
 */
export const optimisticTransition: Variants = {
  initial: { opacity: 0.7, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  confirmed: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

