/**
 * UX Components Index
 * 
 * Centralized export for all UX enhancement components.
 * This makes it easy to import any UX component from a single location.
 */

// ==================== UTILITIES ====================
export {
  triggerHaptic,
  playSound,
  getSoundManager,
  usePrefersReducedMotion,
  useTouchFeedback,
  useFocusTrap,
  useScrollLock,
  useSmoothScroll,
  useInView,
  useDebounce,
  useThrottle,
  useKeyboardShortcut,
  useCopyToClipboard,
} from '@/lib/ux/uxUtils';

// ==================== PERFORMANCE ====================
export {
  createLazyComponent,
  VirtualizedList,
  useDeferredValue,
  useInView as useInViewAdvanced,
  useDeepCallback,
  useRafThrottle,
  useImagePreloader,
  useBatchedUpdates,
  useStableValue,
  usePerformanceMetrics,
  useCleanup,
} from '@/lib/ux/performanceUtils';

// ==================== DESIGN SYSTEM ====================
export {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
  breakpoints,
  components,
  getCssVar,
  setCssVar,
  generateCssVars,
  createClassNames,
  defaultTheme,
  type Theme,
} from '@/lib/ux/designSystem';

// ==================== LOADING STATES ====================
export {
  LoadingSpinner,
  ProgressLoader,
  ContentLoader,
  PulseLoader,
  LoadingOverlay,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  TransactionLoader,
} from './LoadingStates';

// ==================== EMPTY STATES ====================
export {
  EmptyState,
  NoTransactions,
  NoMessages,
  NoNotifications,
  NoSearchResults,
  NoWalletConnected,
  NoFriends,
  NoAchievements,
} from './EmptyStates';

// ==================== INTERACTIVE FEEDBACK ====================
export {
  InteractiveButton,
  RippleButton,
  TiltCard,
  SwipeAction,
  PullToRefresh,
  SuccessAnimation,
  ErrorShake,
  NumberTicker,
  ConfettiBurst,
} from './InteractiveFeedback';

// ==================== TOAST NOTIFICATIONS ====================
export {
  ToastProvider,
  useToast,
  toast,
  setToastFunction,
  type Toast,
  type ToastType,
  type ToastOptions,
  type ToastAction,
} from './ToastNotifications';

// ==================== FORM COMPONENTS ====================
export {
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormToggle,
  SearchInput,
  AddressInput,
  AmountInput,
} from './FormComponents';

// ==================== ACCESSIBILITY ====================
export {
  A11yProvider,
  useA11y,
  SkipLink,
  FocusRing,
  VisuallyHidden,
  KeyboardHint,
  ReducedMotionWrapper,
  AccessibleIcon,
  FocusTrap,
  AnnounceOnMount,
  LoadingAnnouncement,
  AccessibleModal,
  AccessibleTabs,
  AccessibleTooltip,
} from './Accessibility';

// ==================== MEDIA COMPONENTS ====================
export {
  OptimizedImage,
  Avatar,
  TokenIcon,
  VideoPlayer,
  BackgroundVideo,
  ImageGallery,
} from './MediaComponents';

// ==================== PAGE TRANSITIONS ====================
export {
  PageTransitionProvider,
  usePageTransition,
  AnimatedPage,
  StaggeredList,
  StaggeredItem,
  RevealOnScroll,
  Parallax,
  pageTransitions,
  staggerContainer,
  staggerItem,
} from './PageTransitions';

// ==================== MICRO-INTERACTIONS ====================
export {
  Magnetic,
  BounceButton,
  ElasticSlider,
  GlowCard,
  MorphText,
  HoverCard,
  AnimatedCounter,
  LiquidButton,
  FlipCard,
  Typewriter,
} from './MicroInteractions';

// ==================== OPTIMIZED GESTURES ====================
export {
  SwipeableCard,
  LongPress,
  PinchZoom,
  DragReorder,
  DoubleTap,
  MomentumScroll,
} from './OptimizedGestures';

// ==================== SMART RESPONSIVE ====================
export {
  ResponsiveProvider,
  useResponsive,
  Show,
  Hide,
  ResponsiveSwitch,
  AdaptiveLayout,
  TouchButton,
  SafeArea,
  BottomSheet,
  ResponsiveImage,
} from './SmartResponsive';

// ==================== COMPOSITE PROVIDERS ====================

import React from 'react';
import { ToastProvider } from './ToastNotifications';
import { A11yProvider } from './Accessibility';
import { ResponsiveProvider } from './SmartResponsive';

/**
 * Combined UX Provider that wraps all necessary providers
 * for the full UX enhancement experience.
 */
export function UXProvider({ 
  children,
  toastPosition = 'bottom-right',
}: { 
  children: React.ReactNode;
  toastPosition?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}) {
  return (
    <ResponsiveProvider>
      <A11yProvider>
        <ToastProvider position={toastPosition}>
          {children}
        </ToastProvider>
      </A11yProvider>
    </ResponsiveProvider>
  );
}
