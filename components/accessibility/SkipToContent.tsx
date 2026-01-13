'use client';

/**
 * Skip to Content Link
 * 
 * Accessibility feature for keyboard users to skip navigation
 * and jump directly to main content.
 */

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-[#00F0FF] focus:text-[#0A0A0F] focus:rounded-lg focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      aria-label="Skip to main content"
    >
      Skip to content
    </a>
  );
}
