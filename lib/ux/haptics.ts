/**
 * Haptic Feedback Utility
 * 
 * Provides tactile feedback on supported devices (mobile/tablets with haptic support)
 * Falls back gracefully on unsupported devices
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Check if vibration API is available
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// Vibration patterns (in milliseconds)
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 30], // Short pause long
  warning: [30, 30, 30], // Repeated taps
  error: [50, 100, 50, 100, 50], // Strong repeated
  selection: 5, // Very light
};

/**
 * Trigger haptic feedback
 * 
 * @example
 * haptic('success') // Success pattern
 * haptic('light') // Light tap
 * haptic() // Default medium tap
 */
export function haptic(pattern: HapticPattern = 'medium'): void {
  if (!canVibrate) return;
  
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Silently fail on unsupported browsers
  }
}

/**
 * Trigger haptic with custom duration
 */
export function hapticCustom(duration: number): void {
  if (!canVibrate) return;
  
  try {
    navigator.vibrate(Math.min(duration, 500)); // Cap at 500ms
  } catch {
    // Silently fail
  }
}

/**
 * Stop any ongoing vibration
 */
export function hapticStop(): void {
  if (!canVibrate) return;
  
  try {
    navigator.vibrate(0);
  } catch {
    // Silently fail
  }
}

/**
 * React hook for haptic feedback
 * 
 * @example
 * const { trigger, triggerSuccess, triggerError } = useHaptics();
 * 
 * <button onClick={() => { triggerSuccess(); handleAction(); }}>
 */
export function useHaptics() {
  return {
    trigger: haptic,
    triggerLight: () => haptic('light'),
    triggerMedium: () => haptic('medium'),
    triggerHeavy: () => haptic('heavy'),
    triggerSuccess: () => haptic('success'),
    triggerWarning: () => haptic('warning'),
    triggerError: () => haptic('error'),
    triggerSelection: () => haptic('selection'),
    stop: hapticStop,
    isSupported: canVibrate,
  };
}

/**
 * Wrap a click handler with haptic feedback
 * 
 * @example
 * <button onClick={withHaptic(handleClick, 'success')}>
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  handler: T,
  pattern: HapticPattern = 'light'
): T {
  return ((...args: Parameters<T>) => {
    haptic(pattern);
    return handler(...args);
  }) as T;
}

export default {
  haptic,
  hapticCustom,
  hapticStop,
  useHaptics,
  withHaptic,
  isSupported: canVibrate,
};
