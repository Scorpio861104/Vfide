/**
 * Mobile-First Responsive Utilities
 * Tailwind-based responsive design helpers
 */

/**
 * Responsive spacing scale
 * Mobile-first approach: mobile -> tablet -> desktop
 */
export const responsiveSpacing = {
  // Padding utilities
  px: {
    mobile: 'px-4', // 16px
    sm: 'sm:px-6', // 24px
    lg: 'lg:px-8', // 32px
  },
  py: {
    mobile: 'py-4', // 16px
    sm: 'sm:py-6', // 24px
    lg: 'lg:py-8', // 32px
  },
  gap: {
    mobile: 'gap-3', // 12px
    sm: 'sm:gap-4', // 16px
    lg: 'lg:gap-6', // 24px
  },
};

/**
 * Touch target sizes
 * Minimum 44x44px on mobile, 48x48px recommended
 */
export const touchTargets = {
  small: 'min-h-[44px] min-w-[44px]', // Minimum
  medium: 'min-h-[48px] min-w-[48px]', // Recommended
  large: 'min-h-[56px] min-w-[56px]', // Large targets
};

/**
 * Responsive typography scale
 */
export const responsiveTypography = {
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
  h3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
  body: 'text-base sm:text-lg leading-relaxed',
  small: 'text-sm sm:text-base',
};

/**
 * Responsive grid templates
 */
export const responsiveGrids = {
  // 1 column on mobile, 2 on tablet, 3 on desktop
  balanced: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  // 1 column on mobile, 2 on desktop
  twoCol: 'grid-cols-1 lg:grid-cols-2',
  // Full width on mobile, 2 on desktop
  singleToDouble: 'grid-cols-1 md:grid-cols-2',
  // Auto columns based on min width
  auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

/**
 * Legacy/compat grid helpers used across dashboards and docs
 */
export const RESPONSIVE_GRIDS = {
  // Card layouts: 1 col mobile, 2 col tablet, 3 col desktop with gap baked in
  cards: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`,
  // 3-column responsive template
  grid3: responsiveGrids.balanced,
  // 4-column responsive template
  grid4: responsiveGrids.auto,
};

/**
 * Safe area padding for notched devices
 */
export const safeArea = {
  top: 'pt-safe',
  bottom: 'pb-safe',
  left: 'pl-safe',
  right: 'pr-safe',
};

/**
 * Mobile-first breakpoints
 */
export const breakpoints = {
  mobile: 0, // 320px+
  sm: 640, // 640px+
  md: 768, // 768px+
  lg: 1024, // 1024px+
  xl: 1280, // 1280px+
  '2xl': 1536, // 1536px+
};

/**
 * Responsive visibility classes
 */
export const visibility = {
  mobileOnly: 'block sm:hidden', // Show on mobile only
  tabletUp: 'hidden sm:block', // Hide on mobile
  desktopOnly: 'hidden lg:block', // Show on desktop only
  mobileTablet: 'block lg:hidden', // Hide on desktop
};

/**
 * Responsive padding utilities
 * Mobile-first: base -> sm -> md -> lg
 */
export const responsivePadding = {
  container: 'px-4 sm:px-6 md:px-8 lg:px-12',
  section: 'py-6 sm:py-8 md:py-12 lg:py-16',
  card: 'p-4 sm:p-6 md:p-8',
};

/**
 * Responsive flex layouts
 */
export const responsiveFlex = {
  // Stack on mobile, side-by-side on desktop
  stackToRow: 'flex flex-col md:flex-row',
  // Centered on mobile, space-between on desktop
  centerToSpaceBetween: 'flex flex-col sm:flex-row sm:justify-between sm:items-center',
  // Always centered
  centered: 'flex items-center justify-center',
};

/**
 * Mobile-first media query helper
 * Usage in component: if (useMedia('(min-width: 768px)'))
 */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handler = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Responsive container component
 * Automatically manages margins and padding
 */
export function ResponsiveContainer({
  children,
  maxWidth = '1280px',
  className = '',
}: {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto ${responsivePadding.container} ${className}`}
      style={{ maxWidth }}
    >
      {children}
    </div>
  );
}

/**
 * Responsive section component
 * Adds consistent vertical spacing
 */
export function ResponsiveSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${responsivePadding.section} ${className}`}>
      {children}
    </section>
  );
}

/**
 * Image sizes for responsive images
 * Use with next/image srcSet
 */
export const imageSizes = {
  full: '100vw',
  container: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1024px',
  thumbnail: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  icon: '44px',
};

/**
 * Font sizes that scale responsively
 */
export const scalingFontSizes = {
  heading1: 'text-4xl sm:text-5xl lg:text-6xl',
  heading2: 'text-3xl sm:text-4xl lg:text-5xl',
  heading3: 'text-2xl sm:text-3xl lg:text-4xl',
  body: 'text-base sm:text-lg leading-relaxed',
  caption: 'text-xs sm:text-sm',
};

/**
 * Mobile-first z-index scale
 */
export const zIndex = {
  hide: '-z-10',
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modal: 'z-40',
  popover: 'z-50',
};

/**
 * Safe area insets for notched devices
 * Usage: Apply to top/bottom navigation
 */
export const safeAreaInsets = {
  top: 'env(safe-area-inset-top)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
  right: 'env(safe-area-inset-right)',
};

import React from 'react';
