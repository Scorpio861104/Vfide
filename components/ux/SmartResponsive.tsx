'use client';

/**
 * Smart Responsive Components
 * 
 * Components that automatically adapt to screen size,
 * device capabilities, and user preferences.
 */

import React, { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== RESPONSIVE CONTEXT ====================

interface ResponsiveContextValue {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const ResponsiveContext = createContext<ResponsiveContextValue>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  screenWidth: 1920,
  screenHeight: 1080,
  orientation: 'landscape',
  breakpoint: 'xl',
});

export function useResponsive() {
  return useContext(ResponsiveContext);
}

// ==================== RESPONSIVE PROVIDER ====================

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResponsiveContextValue>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    orientation: 'landscape',
    breakpoint: 'xl',
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      let breakpoint: ResponsiveContextValue['breakpoint'] = 'xl';
      if (width < 640) breakpoint = 'xs';
      else if (width < 768) breakpoint = 'sm';
      else if (width < 1024) breakpoint = 'md';
      else if (width < 1280) breakpoint = 'lg';
      else if (width < 1536) breakpoint = 'xl';
      else breakpoint = '2xl';

      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isTouch,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        breakpoint,
      });
    };

    updateState();
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return (
    <ResponsiveContext.Provider value={state}>
      {children}
    </ResponsiveContext.Provider>
  );
}

// ==================== SHOW/HIDE COMPONENTS ====================

export interface ShowProps {
  children: ReactNode;
  on?: ('mobile' | 'tablet' | 'desktop')[];
  above?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  below?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

export function Show({ children, on, above, below }: ShowProps) {
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();

  let shouldShow = true;

  if (on) {
    shouldShow = 
      (on.includes('mobile') && isMobile) ||
      (on.includes('tablet') && isTablet) ||
      (on.includes('desktop') && isDesktop);
  }

  if (above) {
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    const aboveIndex = breakpointOrder.indexOf(above);
    shouldShow = shouldShow && currentIndex >= aboveIndex;
  }

  if (below) {
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    const belowIndex = breakpointOrder.indexOf(below);
    shouldShow = shouldShow && currentIndex < belowIndex;
  }

  if (!shouldShow) return null;
  return <>{children}</>;
}

export function Hide({ children, on, above, below }: ShowProps) {
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();

  let shouldHide = false;

  if (on) {
    shouldHide = 
      (on.includes('mobile') && isMobile) ||
      (on.includes('tablet') && isTablet) ||
      (on.includes('desktop') && isDesktop);
  }

  if (above) {
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    const aboveIndex = breakpointOrder.indexOf(above);
    shouldHide = shouldHide || currentIndex >= aboveIndex;
  }

  if (below) {
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    const belowIndex = breakpointOrder.indexOf(below);
    shouldHide = shouldHide || currentIndex < belowIndex;
  }

  if (shouldHide) return null;
  return <>{children}</>;
}

// ==================== RESPONSIVE SWITCH ====================

export interface ResponsiveSwitchProps {
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
  fallback?: ReactNode;
}

export function ResponsiveSwitch({ mobile, tablet, desktop, fallback }: ResponsiveSwitchProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile && mobile) return <>{mobile}</>;
  if (isTablet && tablet) return <>{tablet}</>;
  if (isDesktop && desktop) return <>{desktop}</>;
  return <>{fallback}</>;
}

// ==================== ADAPTIVE LAYOUT ====================

export interface AdaptiveLayoutProps {
  children: ReactNode;
  mobileLayout?: 'stack' | 'scroll-x' | 'grid-2';
  tabletLayout?: 'stack' | 'grid-2' | 'grid-3' | 'sidebar';
  desktopLayout?: 'grid-2' | 'grid-3' | 'grid-4' | 'sidebar' | 'split';
  gap?: number;
  className?: string;
}

export function AdaptiveLayout({
  children,
  mobileLayout = 'stack',
  tabletLayout = 'grid-2',
  desktopLayout = 'grid-3',
  gap = 4,
  className = '',
}: AdaptiveLayoutProps) {
  const { isMobile, isTablet } = useResponsive();

  const layout = isMobile ? mobileLayout : isTablet ? tabletLayout : desktopLayout;

  const layoutClasses: Record<string, string> = {
    'stack': 'flex flex-col',
    'scroll-x': 'flex overflow-x-auto snap-x snap-mandatory',
    'grid-2': 'grid grid-cols-2',
    'grid-3': 'grid grid-cols-3',
    'grid-4': 'grid grid-cols-4',
    'sidebar': 'grid grid-cols-[280px_1fr]',
    'split': 'grid grid-cols-2',
  };

  return (
    <div className={`${layoutClasses[layout]} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

// ==================== TOUCH OPTIMIZED BUTTON ====================

export interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TouchButton({
  children,
  onClick,
  className = '',
  disabled = false,
  size = 'md',
}: TouchButtonProps) {
  const { isTouch } = useResponsive();

  // Larger touch targets for touch devices
  const sizeClasses = {
    sm: isTouch ? 'min-h-11 px-4' : 'min-h-8 px-3',
    md: isTouch ? 'min-h-12 px-6' : 'min-h-10 px-4',
    lg: isTouch ? 'min-h-14 px-8' : 'min-h-12 px-6',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: isTouch ? 0.95 : 0.98 }}
      className={`
        ${sizeClasses[size]}
        touch-manipulation select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

// ==================== SAFE AREA WRAPPER ====================

export interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export function SafeArea({ 
  children, 
  className = '',
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaProps) {
  const padding = [
    top ? 'pt-[env(safe-area-inset-top)]' : '',
    bottom ? 'pb-[env(safe-area-inset-bottom)]' : '',
    left ? 'pl-[env(safe-area-inset-left)]' : '',
    right ? 'pr-[env(safe-area-inset-right)]' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`${padding} ${className}`}>
      {children}
    </div>
  );
}

// ==================== BOTTOM SHEET (MOBILE) ====================

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, children, title, className = '' }: BottomSheetProps) {
  const { isMobile } = useResponsive();

  // On desktop, render as a centered modal
  if (!isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold">{title}</h2>
                </div>
              )}
              <div className="p-6">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // On mobile, render as bottom sheet
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              bg-white dark:bg-gray-800 
              rounded-t-2xl shadow-xl
              max-h-[90vh] overflow-auto
              pb-[env(safe-area-inset-bottom)]
              ${className}
            `}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            {title && (
              <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-center">{title}</h2>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== RESPONSIVE IMAGE ====================

export interface ResponsiveImageProps {
  src: string;
  alt: string;
  mobileSrc?: string;
  tabletSrc?: string;
  className?: string;
  priority?: boolean;
}

export function ResponsiveImage({
  src,
  alt,
  mobileSrc,
  tabletSrc,
  className = '',
  priority = false,
}: ResponsiveImageProps) {
  const { isMobile, isTablet } = useResponsive();
  const [loaded, setLoaded] = useState(false);

  const imageSrc = isMobile && mobileSrc 
    ? mobileSrc 
    : isTablet && tabletSrc 
      ? tabletSrc 
      : src;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      <motion.img
        src={imageSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default ResponsiveProvider;
