/**
 * Mobile Detection and Responsive Hooks
 * 
 * Provides hooks and utilities for mobile optimization:
 * - Device detection
 * - Screen size detection
 * - Orientation tracking
 * - Touch capability detection
 * - Mobile-specific behavior
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: ScreenSize;
  orientation: Orientation;
  hasTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type Orientation = 'portrait' | 'landscape';

// ============================================================================
// Constants
// ============================================================================

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

// ============================================================================
// Device Detection
// ============================================================================

const detectDevice = (): Pick<MobileInfo, 'isMobile' | 'isTablet' | 'isDesktop' | 'isIOS' | 'isAndroid'> => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isIOS: false,
      isAndroid: false
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isTablet = /ipad|tablet|kindle/.test(userAgent) || 
    (isAndroid && !/mobile/.test(userAgent));
  const isMobile = (isIOS || isAndroid) && !isTablet;
  const isDesktop = !isMobile && !isTablet;

  return { isMobile, isTablet, isDesktop, isIOS, isAndroid };
};

const getScreenSize = (width: number): ScreenSize => {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

const getOrientation = (): Orientation => {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
};

const hasTouchSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// ============================================================================
// Main Hook
// ============================================================================

export const useMobile = (): MobileInfo => {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>(() => {
    const device = detectDevice();
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;

    return {
      ...device,
      screenSize: getScreenSize(width),
      orientation: getOrientation(),
      hasTouch: hasTouchSupport(),
      viewportWidth: width,
      viewportHeight: height
    };
  });

  useEffect(() => {
    const updateMobileInfo = () => {
      const device = detectDevice();
      const width = window.innerWidth;
      const height = window.innerHeight;

      setMobileInfo({
        ...device,
        screenSize: getScreenSize(width),
        orientation: getOrientation(),
        hasTouch: hasTouchSupport(),
        viewportWidth: width,
        viewportHeight: height
      });
    };

    window.addEventListener('resize', updateMobileInfo);
    window.addEventListener('orientationchange', updateMobileInfo);

    return () => {
      window.removeEventListener('resize', updateMobileInfo);
      window.removeEventListener('orientationchange', updateMobileInfo);
    };
  }, []);

  return mobileInfo;
};

// ============================================================================
// Specific Hooks
// ============================================================================

export const useIsMobile = (): boolean => {
  const { isMobile } = useMobile();
  return isMobile;
};

export const useIsTablet = (): boolean => {
  const { isTablet } = useMobile();
  return isTablet;
};

export const useIsDesktop = (): boolean => {
  const { isDesktop } = useMobile();
  return isDesktop;
};

export const useScreenSize = (): ScreenSize => {
  const { screenSize } = useMobile();
  return screenSize;
};

export const useOrientation = (): Orientation => {
  const { orientation } = useMobile();
  return orientation;
};

export const useHasTouch = (): boolean => {
  const { hasTouch } = useMobile();
  return hasTouch;
};

// ============================================================================
// Media Query Hook
// ============================================================================

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

// ============================================================================
// Viewport Hook
// ============================================================================

export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};

// ============================================================================
// Safe Area Hook (for iOS notch/Dynamic Island)
// ============================================================================

export const useSafeArea = () => {
  const [safeArea] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
    }

    const computedStyle = getComputedStyle(document.documentElement);
    const getSafeAreaValue = (side: string) => {
      const value = computedStyle.getPropertyValue(`--safe-area-inset-${side}`);
      return value ? parseInt(value) : 0;
    };

    return {
      top: getSafeAreaValue('top'),
      right: getSafeAreaValue('right'),
      bottom: getSafeAreaValue('bottom'),
      left: getSafeAreaValue('left'),
    };
  });

  return safeArea;
};
