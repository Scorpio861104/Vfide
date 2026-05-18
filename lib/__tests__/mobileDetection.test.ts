/**
 * @jest-environment jsdom
 */
import {
  isMobileDevice,
  resetMobileDetection,
} from '../mobileDetection';

describe('mobileDetection', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    resetMobileDetection();
  });

  afterEach(() => {
    // Reset user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    resetMobileDetection();
  });

  const setUserAgent = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  };

  describe('isMobileDevice', () => {
    it('returns false for desktop user agent', () => {
      setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      expect(isMobileDevice()).toBe(false);
    });

    it('returns true for iPhone user agent', () => {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for Android user agent', () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36');
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for iPad user agent', () => {
      setUserAgent('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for iPod user agent', () => {
      setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(isMobileDevice()).toBe(true);
    });

    it('caches the result on subsequent calls', () => {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      const firstResult = isMobileDevice();

      // Change user agent (shouldn't affect cached result)
      setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      const secondResult = isMobileDevice();

      expect(firstResult).toBe(true);
      expect(secondResult).toBe(true); // Still cached as mobile
    });

    it('recalculates after resetMobileDetection', () => {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(isMobileDevice()).toBe(true);

      resetMobileDetection();

      setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      expect(isMobileDevice()).toBe(false);
    });

    it('handles empty user agent gracefully', () => {
      setUserAgent('');
      expect(isMobileDevice()).toBe(false);
    });
  });
});
