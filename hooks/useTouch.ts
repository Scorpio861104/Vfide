/**
 * Touch Gesture Hooks
 * 
 * Provides hooks for handling touch gestures:
 * - Swipe detection
 * - Pull-to-refresh
 * - Long press
 * - Pinch zoom
 * - Double tap
 */

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export interface TouchPosition {
  x: number;
  y: number;
}

export interface PinchState {
  scale: number;
  isPinching: boolean;
}

// ============================================================================
// Swipe Hook
// ============================================================================

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const useSwipe = (ref: RefObject<HTMLElement>, options: SwipeOptions = {}) => {
  const { threshold = 50 } = options;
  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchEnd.current = null;
    const touch = e.targetTouches[0];
    if (!touch) return;
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.targetTouches[0];
    if (!touch) return;
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > threshold || absDeltaY > threshold) {
      if (absDeltaX > absDeltaY) {
        if (deltaX > 0) {
          options.onSwipeLeft?.();
        } else {
          options.onSwipeRight?.();
        }
      } else {
        if (deltaY > 0) {
          options.onSwipeUp?.();
        } else {
          options.onSwipeDown?.();
        }
      }
    }
  }, [options, threshold]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);
};

// ============================================================================
// Pull-to-Refresh Hook
// ============================================================================

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export const usePullToRefresh = (ref: RefObject<HTMLElement>, options: PullToRefreshOptions) => {
  const { onRefresh, threshold = 80, disabled = false } = options;
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef<number>(0);
  const scrollTop = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    const element = ref.current;
    if (!element) return;

    scrollTop.current = element.scrollTop;
    if (scrollTop.current === 0) {
      const touch = e.touches[0];
      if (!touch) return;
      touchStart.current = touch.clientY;
      setIsPulling(true);
    }
  }, [ref, disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !isPulling || isRefreshing) return;
    
    const element = ref.current;
    if (!element || element.scrollTop > 0) {
      setIsPulling(false);
      return;
    }

    const touchItem = e.touches[0];
    if (!touchItem) return;
    const touch = touchItem.clientY;
    const distance = Math.max(0, touch - touchStart.current);
    setPullDistance(Math.min(distance, threshold * 1.5));
  }, [ref, isPulling, isRefreshing, threshold, disabled]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPulling) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, onRefresh, disabled]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, isRefreshing, pullDistance, progress: Math.min(pullDistance / threshold, 1) };
};

// ============================================================================
// Long Press Hook
// ============================================================================

interface LongPressOptions {
  onLongPress: () => void;
  delay?: number;
  shouldPreventDefault?: boolean;
}

export const useLongPress = (ref: RefObject<HTMLElement>, options: LongPressOptions) => {
  const { onLongPress, delay = 500, shouldPreventDefault = true } = options;
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPressed = useRef(false);

  const start = useCallback((e: TouchEvent | MouseEvent) => {
    if (shouldPreventDefault) {
      e.preventDefault();
    }

    isPressed.current = true;
    setIsLongPressing(false);

    timerRef.current = setTimeout(() => {
      if (isPressed.current) {
        setIsLongPressing(true);
        onLongPress();
      }
    }, delay);
  }, [onLongPress, delay, shouldPreventDefault]);

  const clear = useCallback(() => {
    isPressed.current = false;
    setIsLongPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('mousedown', start);
    element.addEventListener('touchstart', start);
    element.addEventListener('mouseup', clear);
    element.addEventListener('mouseleave', clear);
    element.addEventListener('touchend', clear);
    element.addEventListener('touchcancel', clear);

    return () => {
      element.removeEventListener('mousedown', start);
      element.removeEventListener('touchstart', start);
      element.removeEventListener('mouseup', clear);
      element.removeEventListener('mouseleave', clear);
      element.removeEventListener('touchend', clear);
      element.removeEventListener('touchcancel', clear);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [ref, start, clear]);

  return isLongPressing;
};

// ============================================================================
// Pinch Zoom Hook
// ============================================================================

interface PinchOptions {
  onPinch?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export const usePinch = (ref: RefObject<HTMLElement>, options: PinchOptions = {}) => {
  const { onPinch, onPinchStart, onPinchEnd, minScale = 0.5, maxScale = 3 } = options;
  const [pinchState, setPinchState] = useState<PinchState>({
    scale: 1,
    isPinching: false
  });
  const initialDistance = useRef<number>(0);
  const currentScale = useRef<number>(1);

  const getDistance = (touches: TouchList): number => {
    const [touch1, touch2] = Array.from(touches);
    if (!touch1 || !touch2) return 0;
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance.current = getDistance(e.touches);
      setPinchState(prev => ({ ...prev, isPinching: true }));
      onPinchStart?.();
    }
  }, [onPinchStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current > 0) {
      e.preventDefault();
      const distance = getDistance(e.touches);
      let scale = (distance / initialDistance.current) * currentScale.current;
      scale = Math.max(minScale, Math.min(maxScale, scale));

      setPinchState({ scale, isPinching: true });
      onPinch?.(scale);
    }
  }, [onPinch, minScale, maxScale]);

  const handleTouchEnd = useCallback(() => {
    if (pinchState.isPinching) {
      currentScale.current = pinchState.scale;
      setPinchState(prev => ({ ...prev, isPinching: false }));
      onPinchEnd?.(pinchState.scale);
    }
    initialDistance.current = 0;
  }, [pinchState, onPinchEnd]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return pinchState;
};

// ============================================================================
// Double Tap Hook
// ============================================================================

interface DoubleTapOptions {
  onDoubleTap: () => void;
  delay?: number;
}

export const useDoubleTap = (ref: RefObject<HTMLElement>, options: DoubleTapOptions) => {
  const { onDoubleTap, delay = 300 } = options;
  const lastTap = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap, delay]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('click', handleTap);
    return () => element.removeEventListener('click', handleTap);
  }, [ref, handleTap]);
};
