/**
 * Instant Feedback Utilities
 * 
 * Immediate visual and tactile responses for user actions
 * Makes the UI feel responsive and alive
 */

'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { haptic } from './haptics';

// ============ DEBOUNCE & THROTTLE ============

/**
 * Debounce hook with immediate feedback option
 * 
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback with instant visual feedback
 * 
 * @example
 * const { trigger, isPending } = useDebouncedCallback(
 *   async (value) => await saveToServer(value),
 *   500
 * );
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
) {
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const trigger = useCallback((...args: Parameters<T>) => {
    setIsPending(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await callbackRef.current(...args);
      } finally {
        setIsPending(false);
      }
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setIsPending(false);
    }
  }, []);

  return { trigger, isPending, cancel };
}

// ============ BUTTON FEEDBACK ============

interface UseButtonFeedbackOptions {
  hapticPattern?: 'light' | 'medium' | 'heavy' | 'success' | 'error';
  cooldown?: number; // Prevent rapid clicks
}

/**
 * Hook for button with instant feedback and cooldown
 * 
 * @example
 * const { handleClick, isDisabled, isActive } = useButtonFeedback(
 *   async () => await submitForm(),
 *   { hapticPattern: 'success', cooldown: 1000 }
 * );
 */
export function useButtonFeedback<T>(
  action: () => Promise<T> | T,
  options: UseButtonFeedbackOptions = {}
) {
  const { hapticPattern = 'light', cooldown = 0 } = options;
  
  const [isActive, setIsActive] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const lastClickRef = useRef(0);

  const handleClick = useCallback(async () => {
    const now = Date.now();
    
    // Cooldown check
    if (cooldown > 0 && now - lastClickRef.current < cooldown) {
      return;
    }
    
    lastClickRef.current = now;
    
    // Instant feedback
    haptic(hapticPattern);
    setIsActive(true);
    
    if (cooldown > 0) {
      setIsDisabled(true);
    }

    try {
      await action();
    } finally {
      setIsActive(false);
      
      if (cooldown > 0) {
        setTimeout(() => setIsDisabled(false), cooldown);
      }
    }
  }, [action, hapticPattern, cooldown]);

  return { handleClick, isActive, isDisabled };
}

// ============ FORM FEEDBACK ============

interface FieldState {
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  error?: string;
}

/**
 * Hook for form field with instant validation feedback
 * 
 * @example
 * const { value, onChange, onBlur, state } = useFieldFeedback(
 *   '',
 *   (value) => value.length >= 3 ? null : 'Too short'
 * );
 */
export function useFieldFeedback<T>(
  initialValue: T,
  validate?: (value: T) => string | null
) {
  const [value, setValue] = useState(initialValue);
  const [state, setState] = useState<FieldState>({
    touched: false,
    dirty: false,
    valid: true,
    error: undefined,
  });

  const onChange = useCallback((newValue: T) => {
    setValue(newValue);
    
    const error = validate?.(newValue) ?? null;
    
    setState(prev => ({
      ...prev,
      dirty: true,
      valid: error === null,
      error: error ?? undefined,
    }));
  }, [validate]);

  const onBlur = useCallback(() => {
    setState(prev => ({
      ...prev,
      touched: true,
    }));
    
    // Light haptic on validation error
    if (state.error) {
      haptic('warning');
    }
  }, [state.error]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setState({
      touched: false,
      dirty: false,
      valid: true,
      error: undefined,
    });
  }, [initialValue]);

  return {
    value,
    onChange,
    onBlur,
    state,
    reset,
    isValid: state.valid,
    showError: state.touched && !state.valid,
  };
}

// ============ COPY TO CLIPBOARD ============

interface UseCopyFeedbackOptions {
  successDuration?: number;
  hapticOnSuccess?: boolean;
}

/**
 * Hook for copy-to-clipboard with instant feedback
 * 
 * @example
 * const { copy, copied, error } = useCopyFeedback();
 * 
 * <button onClick={() => copy(address)}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 */
export function useCopyFeedback(options: UseCopyFeedbackOptions = {}) {
  const { successDuration = 2000, hapticOnSuccess = true } = options;
  
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      setCopied(true);
      setError(null);
      
      if (hapticOnSuccess) {
        haptic('success');
      }

      // Reset after duration
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, successDuration);

    } catch (_err) {
      setError('Failed to copy');
      haptic('error');
    }
  }, [successDuration, hapticOnSuccess]);

  return { copy, copied, error };
}

// ============ PULL TO REFRESH ============

interface UsePullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void>;
}

/**
 * Hook for pull-to-refresh gesture on mobile
 * 
 * @example
 * const { pullProgress, isRefreshing, handlers } = usePullToRefresh({
 *   onRefresh: async () => await refetchData()
 * });
 */
export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const { threshold = 80, onRefresh } = options;
  
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && e.touches[0]) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || isRefreshing || !e.touches[0]) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0) {
      const progress = Math.min(diff / threshold, 1);
      setPullProgress(progress);
    }
  }, [threshold, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullProgress >= 1 && !isRefreshing) {
      setIsRefreshing(true);
      haptic('medium');
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullProgress(0);
    startYRef.current = null;
  }, [pullProgress, isRefreshing, onRefresh]);

  return {
    pullProgress,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// ============ DOUBLE TAP ============

/**
 * Hook for double-tap detection
 * 
 * @example
 * const handleDoubleTap = useDoubleTap(() => {
 *   haptic('success');
 *   likePost();
 * });
 */
export function useDoubleTap(
  callback: () => void,
  delay: number = 300
) {
  const lastTapRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    
    if (now - lastTapRef.current < delay) {
      callback();
      lastTapRef.current = 0; // Reset to prevent triple-tap
    } else {
      lastTapRef.current = now;
    }
  }, [callback, delay]);
}

// ============ LONG PRESS ============

interface UseLongPressOptions {
  delay?: number;
  onStart?: () => void;
  onCancel?: () => void;
}

/**
 * Hook for long-press detection
 * 
 * @example
 * const handlers = useLongPress(() => {
 *   haptic('heavy');
 *   showContextMenu();
 * }, { delay: 500 });
 * 
 * <button {...handlers}>Hold me</button>
 */
export function useLongPress(
  callback: () => void,
  options: UseLongPressOptions = {}
) {
  const { delay = 500, onStart, onCancel } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    onStart?.();
    
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      haptic('heavy');
      callback();
    }, delay);
  }, [callback, delay, onStart]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isLongPressRef.current) {
      onCancel?.();
    }
  }, [onCancel]);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
  };
}

export default {
  useDebounce,
  useDebouncedCallback,
  useButtonFeedback,
  useFieldFeedback,
  useCopyFeedback,
  usePullToRefresh,
  useDoubleTap,
  useLongPress,
};
