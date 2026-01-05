/**
 * Accessibility Testing & Utilities
 * Tests and utilities for WCAG 2.1 AA compliance
 */

import { render } from '@testing-library/react';
// @ts-expect-error - jest-axe lacks type definitions but provides runtime functionality
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Test accessibility of a component
 * @param component React component to test
 * @returns AxeResults
 */
export async function testAccessibility(component: React.ReactElement) {
  const { container } = render(component);
  const results = await axe(container);
  return results;
}

/**
 * Check color contrast ratio (WCAG AA compliance)
 * @param foreground RGB color value
 * @param background RGB color value
 * @returns contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  const fgLuminance = getLuminance(fg);
  const bgLuminance = getLuminance(bg);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function getLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Accessibility checklist
 */
export const A11Y_CHECKLIST = {
  // Keyboard Navigation
  keyboardNavigation: {
    description: 'All interactive elements keyboard accessible',
    wcagLevel: 'A',
    tests: [
      'Tab navigation works in logical order',
      'Escape key closes modals/popovers',
      'Enter key activates buttons',
      'Space key activates buttons',
      'Arrow keys work in lists/menus',
    ],
  },

  // Focus Management
  focusManagement: {
    description: 'Focus is visible and properly managed',
    wcagLevel: 'A',
    tests: [
      'Focus indicator is visible (not display: none)',
      'Focus order follows visual hierarchy',
      'Focus is trapped in modals',
      'Focus returns to trigger on close',
      'Focus is not lost on dynamic updates',
    ],
  },

  // Color Contrast
  colorContrast: {
    description: 'All text meets WCAG AA contrast ratios',
    wcagLevel: 'AA',
    tests: [
      'Normal text: 4.5:1 contrast ratio',
      'Large text: 3:1 contrast ratio',
      'UI components: 3:1 contrast ratio',
      'Focus indicators: 3:1 contrast ratio',
      'Disabled state distinguishable',
    ],
  },

  // Semantic HTML
  semanticHtml: {
    description: 'Use semantic HTML elements',
    wcagLevel: 'A',
    tests: [
      'Buttons use <button> element',
      'Links use <a> element',
      'Form controls use proper labels',
      'Headings use <h1>-<h6>',
      'Lists use <ul>/<ol>/<li>',
      'Navigation uses <nav>',
      'Sections use <section>/<article>',
    ],
  },

  // ARIA
  ariaLabeling: {
    description: 'Proper ARIA labels for accessibility',
    wcagLevel: 'A',
    tests: [
      'Icon buttons have aria-label',
      'Form inputs have associated labels',
      'Live regions have aria-live',
      'Buttons have aria-pressed/expanded',
      'Menus have aria-expanded/haspopup',
      'Custom widgets have proper roles',
      'Dialog has aria-labelledby/describedby',
    ],
  },

  // Images & Icons
  imagesAndIcons: {
    description: 'Images and icons are accessible',
    wcagLevel: 'A',
    tests: [
      'Images have descriptive alt text',
      'Decorative images have empty alt=""',
      'Icon buttons have labels',
      'SVGs have title/desc or aria-label',
    ],
  },

  // Forms
  forms: {
    description: 'Forms are accessible and usable',
    wcagLevel: 'A',
    tests: [
      'All form inputs have labels',
      'Error messages are announced',
      'Required fields are marked',
      'Help text is associated',
      'Placeholder is not used as label',
      'Form can be submitted with keyboard',
    ],
  },

  // Motion & Animation
  motionAndAnimation: {
    description: 'Motion respects user preferences',
    wcagLevel: 'A',
    tests: [
      'Animations respect prefers-reduced-motion',
      'No flashing/blinking > 3 per second',
      'No auto-playing audio > 3 seconds',
    ],
  },

  // Color Dependency
  colorNotAlone: {
    description: 'Information not conveyed by color alone',
    wcagLevel: 'A',
    tests: [
      'Status messages use text + color',
      'Error states use text + icon',
      'Charts use patterns + colors',
      'Links are underlined or styled',
    ],
  },

  // Text Sizing
  textSizing: {
    description: 'Text is readable and resizable',
    wcagLevel: 'AA',
    tests: [
      'Body text is at least 14px',
      'Text can be resized to 200%',
      'No content cut off when zoomed',
      'Line height at least 1.5x',
      'Letter spacing at least 0.12em',
    ],
  },

  // Language
  language: {
    description: 'Page language is properly declared',
    wcagLevel: 'A',
    tests: [
      'HTML lang attribute set',
      'Language changes are marked with lang',
      'Text direction is correct',
    ],
  },
};

/**
 * WCAG AA Compliance Checklist for VFIDE
 */
export const VFIDE_A11Y_FIXES = {
  globalFixes: [
    {
      issue: 'Missing lang attribute on html',
      fix: '<html lang="en">',
      wcagCriteria: '3.1.1 Language of Page (Level A)',
      status: 'pending',
    },
    {
      issue: 'Low color contrast in secondary text',
      fix: 'Change #A0A0A5 on #1A1A1D from 3.8:1 to 5:1 ratio',
      wcagCriteria: '1.4.3 Contrast (Minimum) (Level AA)',
      status: 'pending',
    },
    {
      issue: 'Reduced motion not respected in animations',
      fix: 'Add @media (prefers-reduced-motion: reduce) queries',
      wcagCriteria: '2.3.3 Animation from Interactions (Level AAA)',
      status: 'pending',
    },
  ],

  componentFixes: {
    Button: [
      {
        issue: 'Icon buttons missing aria-label',
        fix: 'Add aria-label={tooltipText} to icon buttons',
        wcagCriteria: '1.1.1 Non-text Content (Level A)',
        status: 'pending',
      },
      {
        issue: 'Focus indicator not visible',
        fix: 'Add outline or box-shadow on focus',
        wcagCriteria: '2.4.7 Focus Visible (Level AA)',
        status: 'pending',
      },
    ],
    Dialog: [
      {
        issue: 'Missing focus trap',
        fix: 'Implement focus trap with FocusScope',
        wcagCriteria: '2.1.2 No Keyboard Trap (Level A)',
        status: 'pending',
      },
      {
        issue: 'Dialog not announced to screen readers',
        fix: 'Add role="dialog" and aria-labelledby/describedby',
        wcagCriteria: '4.1.2 Name, Role, Value (Level A)',
        status: 'pending',
      },
    ],
    Forms: [
      {
        issue: 'Input labels not associated',
        fix: 'Add htmlFor on label and id on input',
        wcagCriteria: '1.3.1 Info and Relationships (Level A)',
        status: 'pending',
      },
      {
        issue: 'Error messages not announced',
        fix: 'Add aria-live="polite" and aria-describedby',
        wcagCriteria: '3.3.1 Error Identification (Level A)',
        status: 'pending',
      },
    ],
  },
};
