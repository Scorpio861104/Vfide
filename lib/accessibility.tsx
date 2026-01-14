/**
 * Accessibility Utilities
 * 
 * Comprehensive accessibility support including ARIA attributes,
 * screen reader announcements, and keyboard navigation helpers.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Live region for screen reader announcements
 */
let liveRegion: HTMLDivElement | null = null;

function ensureLiveRegion(): HTMLDivElement {
  if (!liveRegion && typeof document !== 'undefined') {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  return liveRegion!;
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof window === 'undefined') return;

  const region = ensureLiveRegion();
  region.setAttribute('aria-live', priority);
  
  // Clear and set message
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, 100);
}

/**
 * React hook for screen reader announcements
 */
export function useAnnounce() {
  return {
    announce: (message: string, priority?: 'polite' | 'assertive') => 
      announce(message, priority),
    announcePolite: (message: string) => announce(message, 'polite'),
    announceAssertive: (message: string) => announce(message, 'assertive'),
  };
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(container.querySelectorAll(selector));
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0]?.focus();
    }

    // Handle tab navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Skip to content link
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}

/**
 * ARIA label helpers
 */
export const aria = {
  label: (label: string) => ({ 'aria-label': label }),
  labelledby: (id: string) => ({ 'aria-labelledby': id }),
  describedby: (id: string) => ({ 'aria-describedby': id }),
  hidden: (hidden: boolean = true) => ({ 'aria-hidden': hidden }),
  expanded: (expanded: boolean) => ({ 'aria-expanded': expanded }),
  selected: (selected: boolean) => ({ 'aria-selected': selected }),
  checked: (checked: boolean) => ({ 'aria-checked': checked }),
  disabled: (disabled: boolean) => ({ 'aria-disabled': disabled }),
  current: (current: boolean | 'page' | 'step' | 'location') => 
    ({ 'aria-current': current }),
  live: (live: 'off' | 'polite' | 'assertive') => ({ 'aria-live': live }),
  busy: (busy: boolean) => ({ 'aria-busy': busy }),
  invalid: (invalid: boolean) => ({ 'aria-invalid': invalid }),
  required: (required: boolean) => ({ 'aria-required': required }),
  hasPopup: (hasPopup: boolean | 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid') => 
    ({ 'aria-haspopup': hasPopup }),
  controls: (id: string) => ({ 'aria-controls': id }),
  owns: (id: string) => ({ 'aria-owns': id }),
  valueNow: (value: number) => ({ 'aria-valuenow': value }),
  valueMin: (value: number) => ({ 'aria-valuemin': value }),
  valueMax: (value: number) => ({ 'aria-valuemax': value }),
  valueText: (text: string) => ({ 'aria-valuetext': text }),
};

/**
 * Keyboard navigation helpers
 */
export const keyboard = {
  isEnter: (e: React.KeyboardEvent) => e.key === 'Enter',
  isSpace: (e: React.KeyboardEvent) => e.key === ' ',
  isEscape: (e: React.KeyboardEvent) => e.key === 'Escape',
  isArrowUp: (e: React.KeyboardEvent) => e.key === 'ArrowUp',
  isArrowDown: (e: React.KeyboardEvent) => e.key === 'ArrowDown',
  isArrowLeft: (e: React.KeyboardEvent) => e.key === 'ArrowLeft',
  isArrowRight: (e: React.KeyboardEvent) => e.key === 'ArrowRight',
  isTab: (e: React.KeyboardEvent) => e.key === 'Tab',
  
  handleActivation: (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  },
};

/**
 * Focus management hook
 */
export function useFocusManagement() {
  const focusElement = (selector: string | HTMLElement) => {
    if (typeof selector === 'string') {
      const element = document.querySelector(selector) as HTMLElement;
      element?.focus();
    } else {
      selector?.focus();
    }
  };

  const focusFirst = (container: HTMLElement | null) => {
    if (!container) return;
    
    const firstFocusable = container.querySelector(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    firstFocusable?.focus();
  };

  const focusLast = (container: HTMLElement | null) => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    lastElement?.focus();
  };

  return { focusElement, focusFirst, focusLast };
}

/**
 * Visually hidden but accessible to screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

/**
 * Loading announcement
 */
export function useLoadingAnnouncement(isLoading: boolean, message: string = 'Loading') {
  const { announce } = useAnnounce();
  const previousLoading = useRef(isLoading);

  useEffect(() => {
    if (isLoading && !previousLoading.current) {
      announce(message, 'polite');
    } else if (!isLoading && previousLoading.current) {
      announce('Loading complete', 'polite');
    }
    previousLoading.current = isLoading;
  }, [isLoading, message, announce]);
}

/**
 * Route change announcement
 */
export function useRouteAnnouncement(pathname: string) {
  const { announce } = useAnnounce();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== previousPath.current) {
      // Extract page name from pathname
      const pageName = pathname
        .split('/')
        .filter(Boolean)
        .pop() || 'home';
      
      announce(`Navigated to ${pageName} page`, 'assertive');
      previousPath.current = pathname;
    }
  }, [pathname, announce]);
}

/**
 * Focus visible class management
 */
export function useFocusVisible() {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return focusVisible;
}

// Add sr-only styles to global CSS
if (typeof document !== 'undefined' && !document.getElementById('sr-only-styles')) {
  const style = document.createElement('style');
  style.id = 'sr-only-styles';
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    
    .sr-only:focus,
    .sr-only:active {
      position: static;
      width: auto;
      height: auto;
      padding: inherit;
      margin: inherit;
      overflow: visible;
      clip: auto;
      white-space: normal;
    }
    
    /* Focus visible styles */
    body.user-is-tabbing *:focus {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);
}
