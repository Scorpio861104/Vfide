'use client';

/**
 * usePrefersReducedMotion — listens to the OS-level reduce-motion preference.
 *
 * This is the canonical home for the hook. The app/components and
 * app/merchant/components copies exist for now to avoid touching their
 * many local callsites; both re-export this one.
 *
 * Returns `true` if the user has asked the system to reduce motion (via
 * macOS System Settings → Accessibility → Display → Reduce motion, or
 * the equivalent on iOS/Windows/Android). Components should disable
 * decorative animation when this is true and either show a static
 * variant or rely on user-initiated transitions only.
 */

import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
}

export default usePrefersReducedMotion;
