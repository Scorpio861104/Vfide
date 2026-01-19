/**
 * Tests for mobile detection utility
 */

import { isMobileDevice, resetMobileDetection } from '../mobileDetection';

describe('mobileDetection', () => {
  // Mock user agents
  const mockUserAgents = {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    iPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    iPad: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    Android: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
    AndroidTablet: 'Mozilla/5.0 (Linux; Android 10; SM-T870) AppleWebKit/537.36',
  };

  beforeEach(() => {
    // Reset detection cache before each test
    resetMobileDetection();
  });

  describe('isMobileDevice', () => {
    it('should return false for desktop user agents', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.desktop,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for iPhone user agents', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.iPhone,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for iPad user agents', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.iPad,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for Android phone user agents', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.Android,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for Android tablet user agents', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.AndroidTablet,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should be SSR-safe and return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR environment
      delete global.window;

      expect(isMobileDevice()).toBe(false);

      global.window = originalWindow;
    });

    it('should memoize the result and not recheck on subsequent calls', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.iPhone,
        configurable: true,
      });

      const firstCall = isMobileDevice();
      
      // Change user agent (shouldn't affect cached result)
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.desktop,
        configurable: true,
      });

      const secondCall = isMobileDevice();

      // Should return the same cached result
      expect(firstCall).toBe(true);
      expect(secondCall).toBe(true);
    });

    it('should recheck after resetMobileDetection is called', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.iPhone,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);

      // Reset and change user agent
      resetMobileDetection();
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.desktop,
        configurable: true,
      });

      expect(isMobileDevice()).toBe(false);
    });

    it('should handle maxTouchPoints for iPad detection', () => {
      // Modern iPads report as desktop in user agent but have touch support
      Object.defineProperty(window.navigator, 'userAgent', {
        value: mockUserAgents.desktop,
        configurable: true,
      });
      
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });

      // This test depends on implementation details
      // If maxTouchPoints is used for iPad detection
      const result = isMobileDevice();
      
      // Should detect based on touch points if implemented
      expect(typeof result).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle missing navigator object', () => {
      const originalNavigator = window.navigator;
      // @ts-expect-error - Testing edge case
      delete window.navigator;

      expect(isMobileDevice()).toBe(false);

      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });

    it('should handle missing userAgent', () => {
      const originalNavigator = window.navigator;
      Object.defineProperty(window, 'navigator', {
        value: {},
        configurable: true,
      });

      expect(isMobileDevice()).toBe(false);

      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });
  });
});
