/**
 * Mobile Responsive Testing Utilities
 * Tools for testing mobile responsiveness and touch interactions
 */

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

/**
 * Render component at specific viewport size
 */
export function renderAtViewport(
  component: React.ReactElement,
  width: number,
  height: number = 800
) {
  // Mock window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Trigger resize event
  window.dispatchEvent(new Event('resize'));

  return render(component);
}

/**
 * Test viewports
 */
export const VIEWPORTS = {
  iPhone12Mini: { width: 375, height: 667 },
  iPhone14: { width: 390, height: 844 },
  iPhone14Pro: { width: 393, height: 852 },
  iPhone14ProMax: { width: 430, height: 932 },
  iPad: { width: 768, height: 1024 },
  iPadPro: { width: 1024, height: 1366 },
  AndroidSmall: { width: 360, height: 640 },
  AndroidLarge: { width: 412, height: 915 },
  Laptop: { width: 1280, height: 720 },
  Desktop: { width: 1920, height: 1080 },
};

/**
 * Viewport testing helper
 */
export function describeResponsive(
  testName: string,
  callback: (viewport: typeof VIEWPORTS[keyof typeof VIEWPORTS]) => void
) {
  describe(testName, () => {
    Object.entries(VIEWPORTS).forEach(([name, viewport]) => {
      it(`should work on ${name} (${viewport.width}x${viewport.height})`, () => {
        callback(viewport);
      });
    });
  });
}

/**
 * Touch interaction simulator
 */
export class TouchSimulator {
  /**
   * Simulate tap on element
   */
  static async tap(element: HTMLElement) {
    const user = userEvent.setup();

    // Create touch events
    const touchStart = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [
        {
          identifier: 0,
          target: element,
          clientX: 0,
          clientY: 0,
          screenX: 0,
          screenY: 0,
          pageX: 0,
          pageY: 0,
          radiusX: 2.5,
          radiusY: 2.5,
          rotationAngle: 0,
          force: 1,
        } as Touch,
      ],
    });

    const touchEnd = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
    });

    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchEnd);
  }

  /**
   * Simulate swipe
   */
  static async swipe(
    element: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100
  ) {
    const startX = 100;
    const startY = 100;
    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'left':
        endX -= distance;
        break;
      case 'right':
        endX += distance;
        break;
      case 'up':
        endY -= distance;
        break;
      case 'down':
        endY += distance;
        break;
    }

    const touchStart = new TouchEvent('touchstart', {
      bubbles: true,
      touches: [
        {
          clientX: startX,
          clientY: startY,
          identifier: 0,
          target: element,
        } as Touch,
      ],
    });

    const touchMove = new TouchEvent('touchmove', {
      bubbles: true,
      touches: [
        {
          clientX: endX,
          clientY: endY,
          identifier: 0,
          target: element,
        } as Touch,
      ],
    });

    const touchEnd = new TouchEvent('touchend', {
      bubbles: true,
      touches: [],
    });

    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchMove);
    element.dispatchEvent(touchEnd);
  }

  /**
   * Simulate pinch zoom
   */
  static async pinch(element: HTMLElement, scale: number = 1.5) {
    const touchStart = new TouchEvent('touchstart', {
      bubbles: true,
      touches: [
        { clientX: 50, clientY: 50, identifier: 0, target: element } as Touch,
        { clientX: 100, clientY: 100, identifier: 1, target: element } as Touch,
      ],
    });

    const distance = 50 * scale;
    const touchMove = new TouchEvent('touchmove', {
      bubbles: true,
      touches: [
        { clientX: 50 - distance / 2, clientY: 50 - distance / 2, identifier: 0, target: element } as Touch,
        { clientX: 100 + distance / 2, clientY: 100 + distance / 2, identifier: 1, target: element } as Touch,
      ],
    });

    const touchEnd = new TouchEvent('touchend', {
      bubbles: true,
      touches: [],
    });

    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchMove);
    element.dispatchEvent(touchEnd);
  }
}

/**
 * Check if element has adequate touch target size
 */
export function hasSufficientTouchTarget(element: HTMLElement, minSize: number = 44): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Check if touch targets have adequate spacing
 */
export function hasSufficientSpacing(
  elements: HTMLElement[],
  minGap: number = 8
): boolean {
  for (let i = 0; i < elements.length - 1; i++) {
    const rect1 = elements[i].getBoundingClientRect();
    const rect2 = elements[i + 1].getBoundingClientRect();

    const gap = rect2.top - (rect1.top + rect1.height);

    if (gap < minGap) {
      return false;
    }
  }

  return true;
}

/**
 * Mobile accessibility tests
 */
describe('Mobile Accessibility', () => {
  it('all buttons should have minimum 44px touch target', () => {
    const buttons = document.querySelectorAll('button');

    buttons.forEach(button => {
      expect(hasSufficientTouchTarget(button as HTMLElement, 44)).toBe(true);
    });
  });

  it('all interactive elements should have adequate spacing', () => {
    const buttons = Array.from(
      document.querySelectorAll('button, a, input, [role="button"]')
    ) as HTMLElement[];

    expect(hasSufficientSpacing(buttons, 8)).toBe(true);
  });

  it('should support touch events on buttons', async () => {
    const button = document.querySelector('button') as HTMLElement;

    if (button) {
      const handleClick = jest.fn();
      button.addEventListener('click', handleClick);

      await TouchSimulator.tap(button);

      expect(handleClick).toHaveBeenCalled();
    }
  });

  it('should work on small mobile viewport', () => {
    renderAtViewport(
      <button>Test</button>,
      VIEWPORTS.iPhone12Mini.width,
      VIEWPORTS.iPhone12Mini.height
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should work on tablet viewport', () => {
    renderAtViewport(
      <button>Test</button>,
      VIEWPORTS.iPad.width,
      VIEWPORTS.iPad.height
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should work on desktop viewport', () => {
    renderAtViewport(
      <button>Test</button>,
      VIEWPORTS.Desktop.width,
      VIEWPORTS.Desktop.height
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});

/**
 * Check for horizontal scrolling
 */
export function checkForHorizontalScroll(): boolean {
  const body = document.body;
  return body.scrollWidth > window.innerWidth;
}

/**
 * Performance metrics for mobile
 */
export function getMobileMetrics() {
  return {
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    hasHorizontalScroll: checkForHorizontalScroll(),
    touchSupported: 'ontouchstart' in window,
  };
}

import { screen } from '@testing-library/react';
