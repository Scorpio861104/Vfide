/**
 * VFIDE UX Enhancement Library
 * 
 * A comprehensive set of utilities for creating smooth,
 * responsive, and delightful user experiences.
 * 
 * @example
 * import { haptic, useOptimistic, useCopyFeedback } from '@/lib/ux';
 */

// Haptic feedback for tactile response
export {
  haptic,
  hapticCustom,
  hapticStop,
  useHaptics,
  withHaptic,
} from './haptics';

// Optimistic updates for instant UI feedback
export {
  useOptimistic,
  useOptimisticList,
  useOptimisticToggle,
} from './optimistic';

// Reduced motion support for accessibility
export {
  usePrefersReducedMotion,
  useMotionPreference,
  MotionProvider,
  getSafeVariants,
  getSafeTransition,
  safeAnimate,
  getAnimationClass,
  getReducedMotionStyles,
} from './reducedMotion';

// Instant feedback utilities
export {
  useDebounce,
  useDebouncedCallback,
  useButtonFeedback,
  useFieldFeedback,
  useCopyFeedback,
  usePullToRefresh,
  useDoubleTap,
  useLongPress,
} from './feedback';

// Type exports
export type { } from './haptics';
export type { } from './optimistic';
export type { } from './reducedMotion';
export type { } from './feedback';
