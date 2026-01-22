/**
 * WCAG 2.1 Accessibility Helpers
 * 
 * Utilities for ensuring WCAG compliance
 */

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Check if contrast meets WCAG standards
 */
export function isWCAGCompliant(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): { compliant: boolean; ratio: number; required: number } {
  const ratio = getContrastRatio(foreground, background);
  
  let required: number;
  if (level === 'AAA') {
    required = isLargeText ? 4.5 : 7;
  } else {
    required = isLargeText ? 3 : 4.5;
  }
  
  return {
    compliant: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required,
  };
}

/**
 * Generate accessible label for form inputs
 */
export function generateAccessibleLabel(
  id: string,
  label: string,
  required: boolean = false,
  description?: string
): {
  labelProps: { htmlFor: string; id: string };
  inputProps: { id: string; 'aria-required': boolean; 'aria-describedby'?: string };
  descriptionProps?: { id: string };
} {
  const descriptionId = description ? `${id}-description` : undefined;
  
  return {
    labelProps: {
      htmlFor: id,
      id: `${id}-label`,
    },
    inputProps: {
      id,
      'aria-required': required,
      ...(descriptionId && { 'aria-describedby': descriptionId }),
    },
    ...(descriptionId && {
      descriptionProps: { id: descriptionId },
    }),
  };
}

/**
 * Create accessible announcement for screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof document === 'undefined') return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tabIndex = element.getAttribute('tabindex');
  const isInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
  
  return isInteractive || (tabIndex !== null && parseInt(tabIndex) >= 0);
}

/**
 * Ensure focus trap for modals
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Generate skip link for keyboard navigation
 */
export function generateSkipLink(targetId: string, label: string = 'Skip to main content') {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only',
    children: label,
  };
}
