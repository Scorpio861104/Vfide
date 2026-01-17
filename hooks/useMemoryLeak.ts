/**
 * Memory Leak Prevention Utilities
 * 
 * Provides hooks and utilities to prevent common memory leaks in React components:
 * - WebSocket cleanup
 * - Timer cleanup
 * - Event listener cleanup
 * - Subscription cleanup
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   // Automatically cleaned up on unmount
 *   const safeTimeout = useSafeTimeout();
 *   const safeInterval = useSafeInterval();
 *   
 *   useEffect(() => {
 *     safeTimeout(() => console.log('This will be cleaned up'), 1000);
 *   }, []);
 * }
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Safe setTimeout that cleans up on unmount
 */
export function useSafeTimeout() {
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      timeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    timeoutsRef.current.add(timeout);
    return timeout;
  }, []);
}

/**
 * Safe setInterval that cleans up on unmount
 */
export function useSafeInterval() {
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    return () => {
      // Cleanup all intervals on unmount
      intervalsRef.current.forEach((interval) => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, []);

  return useCallback((callback: () => void, delay: number) => {
    const interval = setInterval(callback, delay);
    intervalsRef.current.add(interval);
    return interval;
  }, []);
}

/**
 * Safe event listener that cleans up on unmount
 */
export function useSafeEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | Document | HTMLElement = window,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[K]);
    
    element.addEventListener(eventName, eventListener, options);
    
    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

/**
 * Safe WebSocket connection that cleans up on unmount
 */
export function useSafeWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup WebSocket on unmount
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  const connect = useCallback((url: string) => {
    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    socketRef.current = new WebSocket(url);
    return socketRef.current;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  return { connect, disconnect, socket: socketRef.current };
}

/**
 * Safe subscription that cleans up on unmount
 */
export function useSafeSubscription<T>(
  subscribe: (callback: (value: T) => void) => () => void,
  callback: (value: T) => void
) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = subscribe((value) => callbackRef.current(value));
    return unsubscribe;
  }, [subscribe]);
}

/**
 * Safe async effect that prevents memory leaks from cancelled requests
 */
export function useSafeAsync<T>(
  asyncFunction: () => Promise<T>,
  onSuccess: (result: T) => void,
  deps: React.DependencyList = []
) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    asyncFunction().then((result) => {
      if (mountedRef.current) {
        onSuccess(result);
      }
    });

    return () => {
      mountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Debounced value that cleans up timer on unmount
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Cleanup utility for component unmount
 */
export function useCleanup(cleanup: () => void) {
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
}

/**
 * Safe RAF (requestAnimationFrame) that cancels on unmount
 */
export function useSafeRAF() {
  const rafsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    return () => {
      // Cancel all RAF on unmount
      rafsRef.current.forEach((raf) => cancelAnimationFrame(raf));
      rafsRef.current.clear();
    };
  }, []);

  return useCallback((callback: FrameRequestCallback) => {
    const raf = requestAnimationFrame((time) => {
      rafsRef.current.delete(raf);
      callback(time);
    });
    rafsRef.current.add(raf);
    return raf;
  }, []);
}

/**
 * Check if component is mounted
 * Useful for preventing setState on unmounted components
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}
