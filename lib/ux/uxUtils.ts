'use client';

/**
 * UX Optimization Utilities
 * 
 * A comprehensive set of UX enhancements including:
 * - Haptic feedback
 * - Sound effects
 * - Reduced motion support
 * - Touch optimizations
 * - Focus management
 * - Scroll behaviors
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ==================== HAPTIC FEEDBACK ====================

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 20],
  warning: [30, 50, 30],
  error: [50, 30, 50, 30, 50],
  selection: [5],
};

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof navigator === 'undefined') return;
  
  // Use Vibration API if available
  if ('vibrate' in navigator) {
    const pattern = hapticPatterns[type];
    navigator.vibrate(pattern);
  }
}

export function useHapticFeedback() {
  return useCallback((type: HapticType = 'light') => {
    triggerHaptic(type);
  }, []);
}

// ==================== SOUND EFFECTS ====================

type SoundType = 'click' | 'success' | 'error' | 'notification' | 'send' | 'receive' | 'pop';

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled = true;
  private volume = 0.3;

  constructor() {
    if (typeof window === 'undefined') return;
    
    // Load sounds lazily
    this.preload();
  }

  private preload() {
    // These would be actual audio files in production
    // For now, we use the Web Audio API to generate sounds
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  play(type: SoundType) {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<SoundType, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 1000, duration: 0.05, type: 'sine' },
        success: { freq: 800, duration: 0.15, type: 'sine' },
        error: { freq: 200, duration: 0.2, type: 'square' },
        notification: { freq: 600, duration: 0.1, type: 'sine' },
        send: { freq: 500, duration: 0.08, type: 'sine' },
        receive: { freq: 700, duration: 0.12, type: 'sine' },
        pop: { freq: 400, duration: 0.05, type: 'sine' },
      };

      const sound = sounds[type];
      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(this.volume * 0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch {
      // Audio context not available
    }
  }
}

let soundManager: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManager) {
    soundManager = new SoundManager();
  }
  return soundManager;
}

export function playSound(type: SoundType): void {
  getSoundManager().play(type);
}

export function useSoundEffects() {
  const play = useCallback((type: SoundType) => {
    playSound(type);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    getSoundManager().setEnabled(enabled);
  }, []);

  const setVolume = useCallback((volume: number) => {
    getSoundManager().setVolume(volume);
  }, []);

  return { play, setEnabled, setVolume };
}

// ==================== REDUCED MOTION ====================

export function usePrefersReducedMotion(): boolean {
  const getInitialState = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  
  const [reducedMotion, setReducedMotion] = useState(getInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

export function getAnimationDuration(base: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : base;
}

// ==================== TOUCH OPTIMIZATIONS ====================

export interface TouchTargetProps {
  minSize?: number;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function useTouchFeedback() {
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.97)';
    target.style.opacity = '0.9';
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = '';
    target.style.opacity = '';
    triggerHaptic('selection');
  }, []);

  return { handleTouchStart, handleTouchEnd };
}

// ==================== FOCUS MANAGEMENT ====================

export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
}

export function useAutoFocus(ref: React.RefObject<HTMLElement | null>, shouldFocus = true) {
  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus();
    }
  }, [ref, shouldFocus]);
}

// ==================== SCROLL BEHAVIORS ====================

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    const scrollY = window.scrollY;
    const body = document.body;
    
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
}

export function useSmoothScroll() {
  const scrollTo = useCallback((elementId: string, offset = 0) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { scrollTo, scrollToTop };
}

export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

// ==================== INTERSECTION OBSERVER ====================

export function useInView(
  ref: React.RefObject<HTMLElement | null>,
  options: IntersectionObserverInit = {}
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setInView(entry.isIntersecting);
      }
    }, { threshold: 0.1, ...options });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options]);

  return inView;
}

// ==================== DEBOUNCE & THROTTLE ====================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (lastUpdateRef.current === 0) {
      lastUpdateRef.current = now;
    }
    if (now - lastUpdateRef.current >= interval) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThrottledValue(value);
      lastUpdateRef.current = now;
    }
  }, [value, interval]);

  return throttledValue;
}

// ==================== KEYBOARD SHORTCUTS ====================

type KeyCombo = string;

export function useKeyboardShortcut(
  keyCombo: KeyCombo,
  callback: () => void,
  options: { enabled?: boolean; preventDefault?: boolean } = {}
) {
  const { enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = keyCombo.toLowerCase().split('+');
      const modifiers = {
        ctrl: keys.includes('ctrl') || keys.includes('cmd'),
        shift: keys.includes('shift'),
        alt: keys.includes('alt'),
      };
      const key = keys.find(k => !['ctrl', 'cmd', 'shift', 'alt'].includes(k));

      const ctrlMatch = modifiers.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = modifiers.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = modifiers.alt ? e.altKey : !e.altKey;
      const keyMatch = key ? e.key.toLowerCase() === key : true;

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        if (preventDefault) e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyCombo, callback, enabled, preventDefault]);
}

// ==================== COPY TO CLIPBOARD ====================

export function useCopyToClipboard() {
  const copiedRef = useRef(false);
  
  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      triggerHaptic('success');
      playSound('success');
      copiedRef.current = true;
      setTimeout(() => { copiedRef.current = false; }, 2000);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        triggerHaptic('success');
        copiedRef.current = true;
        setTimeout(() => { copiedRef.current = false; }, 2000);
        return true;
      } catch {
        triggerHaptic('error');
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, []);

  return { copy, get copied() { return copiedRef.current; } };
}

export default {
  triggerHaptic,
  playSound,
  usePrefersReducedMotion,
  useTouchFeedback,
  useFocusTrap,
  useScrollLock,
  useKeyboardShortcut,
  useCopyToClipboard,
};
