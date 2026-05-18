/**
 * Mobile Device Detection Utility
 * 
 * SSR-safe mobile device detection with memoization.
 * Used to optimize wallet connector selection and UI layout.
 */

let cachedResult: boolean | null = null;

/**
 * Detects if the current device is a mobile device
 * 
 * @returns true if mobile, false if desktop, false during SSR
 * 
 * Features:
 * - SSR-safe (returns false when window is undefined)
 * - Memoized (only checks once per session)
 * - Comprehensive mobile detection regex
 */
export function isMobileDevice(): boolean {
  // Return cached result if available
  if (cachedResult !== null) {
    return cachedResult;
  }

  // SSR: return false (will be corrected on client-side)
  if (typeof window === 'undefined') {
    return false;
  }

  // Detect mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Cache the result
  cachedResult = isMobile;

  return isMobile;
}

/**
 * Reset the cached mobile detection result
 * Useful for testing or when user agent changes
 */
export function resetMobileDetection(): void {
  cachedResult = null;
}
