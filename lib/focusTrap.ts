/**
 * Focus Trap Utility
 * 
 * Phase 4: Trap focus within modal for better keyboard navigation
 */

import { useEffect, useRef } from 'react';

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selector));
}

/**
 * React hook for focus trap
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return;
      }

      // Shift + Tab (backwards)
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      }
      // Tab (forwards)
      else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Scroll to element smoothly
 */
export function scrollToElement(elementId: string, offset: number = 0): void {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  const y = element.getBoundingClientRect().top + window.pageYOffset + offset;
  
  window.scrollTo({
    top: y,
    behavior: 'smooth',
  });
}

/**
 * Scroll to top smoothly
 */
export function scrollToTop(): void {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}
