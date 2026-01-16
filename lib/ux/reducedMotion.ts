/**
 * Reduced Motion Support
 * 
 * Respects user's system preference for reduced motion
 * Critical for accessibility and motion sensitivity
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ============ HOOK ============

/**
 * Hook to detect if user prefers reduced motion
 * 
 * @example
 * const prefersReduced = usePrefersReducedMotion();
 * 
 * <motion.div
 *   animate={prefersReduced ? {} : { scale: 1.1 }}
 * />
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReduced(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}

// ============ CONTEXT ============

interface MotionContextType {
  prefersReducedMotion: boolean;
  animationDuration: number;
  shouldAnimate: boolean;
}

const MotionContext = createContext<MotionContextType>({
  prefersReducedMotion: false,
  animationDuration: 0.3,
  shouldAnimate: true,
});

interface MotionProviderProps {
  children: ReactNode;
  /** Force reduced motion regardless of system preference */
  forceReducedMotion?: boolean;
}

/**
 * Provider for motion preferences throughout the app
 */
export function MotionProvider({ children, forceReducedMotion = false }: MotionProviderProps) {
  const systemPreference = usePrefersReducedMotion();
  const prefersReducedMotion = forceReducedMotion || systemPreference;

  const value: MotionContextType = {
    prefersReducedMotion,
    animationDuration: prefersReducedMotion ? 0 : 0.3,
    shouldAnimate: !prefersReducedMotion,
  };

  // Note: This file should be renamed to .tsx if using JSX
  // For now, return children wrapped in context using createElement
  return React.createElement(
    MotionContext.Provider,
    { value },
    children
  );
}

/**
 * Hook to access motion context
 */
export function useMotionPreference() {
  return useContext(MotionContext);
}

// ============ UTILITIES ============

/**
 * Get safe animation variants based on motion preference
 * 
 * @example
 * const variants = getSafeVariants(prefersReduced, {
 *   hidden: { opacity: 0, y: 20 },
 *   visible: { opacity: 1, y: 0 },
 * });
 */
export function getSafeVariants<T extends Record<string, object>>(
  prefersReduced: boolean,
  variants: T
): T | Record<keyof T, object> {
  if (!prefersReduced) return variants;

  // For reduced motion, only keep opacity transitions (no movement)
  const safeVariants = {} as Record<keyof T, object>;
  
  for (const key in variants) {
    const variant = variants[key];
    safeVariants[key] = {
      opacity: (variant as Record<string, unknown>).opacity ?? 1,
    };
  }
  
  return safeVariants;
}

/**
 * Get safe transition based on motion preference
 */
export function getSafeTransition(
  prefersReduced: boolean,
  transition: object = { duration: 0.3 }
): object {
  if (!prefersReduced) return transition;
  
  return { duration: 0.01 }; // Near-instant for reduced motion
}

/**
 * Conditional animation helper
 * 
 * @example
 * <motion.div
 *   {...safeAnimate(prefersReduced, {
 *     initial: { opacity: 0, scale: 0.9 },
 *     animate: { opacity: 1, scale: 1 },
 *   })}
 * />
 */
export function safeAnimate(
  prefersReduced: boolean,
  props: {
    initial?: object;
    animate?: object;
    exit?: object;
    transition?: object;
  }
) {
  if (!prefersReduced) return props;

  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.01 },
  };
}

// ============ CSS CLASS HELPERS ============

/**
 * Get animation classes that respect reduced motion
 * 
 * @example
 * <div className={getAnimationClass(prefersReduced, 'animate-bounce', 'opacity-100')} />
 */
export function getAnimationClass(
  prefersReduced: boolean,
  animationClass: string,
  fallbackClass: string = ''
): string {
  return prefersReduced ? fallbackClass : animationClass;
}

/**
 * CSS-in-JS helper for reduced motion
 * 
 * @example
 * const styles = getReducedMotionStyles(prefersReduced, {
 *   transition: 'transform 0.3s ease',
 *   animation: 'bounce 1s infinite',
 * });
 */
export function getReducedMotionStyles(
  prefersReduced: boolean,
  styles: React.CSSProperties
): React.CSSProperties {
  if (!prefersReduced) return styles;

  const { transition, animation, transform, ...rest } = styles;
  
  return {
    ...rest,
    transition: 'opacity 0.01s',
  };
}

export default {
  usePrefersReducedMotion,
  useMotionPreference,
  MotionProvider,
  getSafeVariants,
  getSafeTransition,
  safeAnimate,
  getAnimationClass,
  getReducedMotionStyles,
};
