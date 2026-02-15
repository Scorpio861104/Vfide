'use client';

/**
 * Toast Notification System
 * 
 * A beautiful, accessible toast notification system with
 * animations, progress indicators, and action buttons.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { triggerHaptic, playSound, usePrefersReducedMotion } from '@/lib/ux/uxUtils';

// ==================== TYPES ====================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
  link?: { label: string; href: string };
  progress?: boolean;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  createdAt: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
  link?: { label: string; href: string };
  progress?: boolean;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  // Convenience methods
  success: (options: ToastOptions | string) => string;
  error: (options: ToastOptions | string) => string;
  warning: (options: ToastOptions | string) => string;
  info: (options: ToastOptions | string) => string;
  loading: (options: ToastOptions | string) => string;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: ToastOptions | string;
      success: ToastOptions | string | ((data: T) => ToastOptions | string);
      error: ToastOptions | string | ((err: Error) => ToastOptions | string);
    }
  ) => Promise<T>;
}

// ==================== CONTEXT ====================

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ==================== PROVIDER ====================

export function ToastProvider({ 
  children,
  position = 'bottom-right',
  maxToasts = 5,
}: { 
  children: React.ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  maxToasts?: number;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }

    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      toast?.onDismiss?.();
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addToast = useCallback((type: ToastType, options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(16).padStart(2, '0')).join('')}`;
    const duration = options.duration ?? (type === 'loading' ? Infinity : 5000);
    const dismissible = options.dismissible ?? true;

    const toast: Toast = {
      id,
      type,
      createdAt: Date.now(),
      duration,
      dismissible,
      ...options,
    };

    // Play sound and haptic based on type
    if (type === 'success') {
      triggerHaptic('success');
      playSound('success');
    } else if (type === 'error') {
      triggerHaptic('error');
      playSound('error');
    } else if (type === 'warning') {
      triggerHaptic('warning');
    }

    setToasts((prev) => {
      const newToasts = [toast, ...prev];
      // Remove oldest toasts if exceeding max
      while (newToasts.length > maxToasts) {
        const removed = newToasts.pop();
        if (removed) {
          const timeout = timeoutsRef.current.get(removed.id);
          if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(removed.id);
          }
        }
      }
      return newToasts;
    });

    // Auto-dismiss
    if (duration !== Infinity) {
      const timeout = setTimeout(() => dismissToast(id), duration);
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [maxToasts, dismissToast]);

  const dismissAll = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const normalizeOptions = (options: ToastOptions | string): ToastOptions => {
    return typeof options === 'string' ? { title: options } : options;
  };

  const success = useCallback((options: ToastOptions | string) => {
    return addToast('success', normalizeOptions(options));
  }, [addToast]);

  const error = useCallback((options: ToastOptions | string) => {
    return addToast('error', normalizeOptions(options));
  }, [addToast]);

  const warning = useCallback((options: ToastOptions | string) => {
    return addToast('warning', normalizeOptions(options));
  }, [addToast]);

  const info = useCallback((options: ToastOptions | string) => {
    return addToast('info', normalizeOptions(options));
  }, [addToast]);

  const loading = useCallback((options: ToastOptions | string) => {
    return addToast('loading', normalizeOptions(options));
  }, [addToast]);

  const promise = useCallback(async <T,>(
    promiseToHandle: Promise<T>,
    options: {
      loading: ToastOptions | string;
      success: ToastOptions | string | ((data: T) => ToastOptions | string);
      error: ToastOptions | string | ((err: Error) => ToastOptions | string);
    }
  ): Promise<T> => {
    const id = addToast('loading', normalizeOptions(options.loading));

    try {
      const data = await promiseToHandle;
      const successOptions = typeof options.success === 'function' 
        ? options.success(data) 
        : options.success;
      
      updateToast(id, {
        type: 'success',
        ...normalizeOptions(successOptions),
        duration: 5000,
      });

      // Auto-dismiss after success
      setTimeout(() => dismissToast(id), 5000);

      return data;
    } catch (err) {
      const errorOptions = typeof options.error === 'function'
        ? options.error(err as Error)
        : options.error;
      
      updateToast(id, {
        type: 'error',
        ...normalizeOptions(errorOptions),
        duration: 5000,
      });

      // Auto-dismiss after error
      setTimeout(() => dismissToast(id), 5000);

      throw err;
    }
  }, [addToast, updateToast, dismissToast]);

  // Cleanup on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  const isTop = position.startsWith('top');

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      dismissToast,
      dismissAll,
      updateToast,
      success,
      error,
      warning,
      info,
      loading,
      promise,
    }}>
      {children}
      
      {/* Toast Container */}
      <div
        role="region"
        aria-label="Notifications"
        className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${positionClasses[position]}`}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
              direction={isTop ? 'down' : 'up'}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ==================== TOAST ITEM ====================

function ToastItem({
  toast,
  onDismiss,
  direction,
}: {
  toast: Toast;
  onDismiss: () => void;
  direction: 'up' | 'down';
}) {
  const reducedMotion = usePrefersReducedMotion();
  const progressRef = useRef<HTMLDivElement>(null);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    loading: <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />,
    promise: <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />,
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
    loading: 'bg-cyan-500/10 border-cyan-500/30',
    promise: 'bg-cyan-500/10 border-cyan-500/30',
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    loading: 'bg-cyan-500',
    promise: 'bg-cyan-500',
  };

  // Progress bar animation
  useEffect(() => {
    if (toast.progress && toast.duration && toast.duration !== Infinity && progressRef.current) {
      progressRef.current.style.transition = `width ${toast.duration}ms linear`;
      progressRef.current.style.width = '0%';
    }
  }, [toast.progress, toast.duration]);

  return (
    <motion.div
      layout
      initial={reducedMotion ? { opacity: 0 } : { 
        opacity: 0, 
        y: direction === 'up' ? 20 : -20,
        scale: 0.95,
      }}
      animate={reducedMotion ? { opacity: 1 } : { 
        opacity: 1, 
        y: 0,
        scale: 1,
      }}
      exit={reducedMotion ? { opacity: 0 } : { 
        opacity: 0, 
        scale: 0.95,
        transition: { duration: 0.15 },
      }}
      className={`
        pointer-events-auto
        relative overflow-hidden
        w-80 max-w-[calc(100vw-2rem)]
        rounded-xl border backdrop-blur-xl
        shadow-xl shadow-black/20
        ${bgColors[toast.type]}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0">
            {toast.icon || icons[toast.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              {toast.title}
            </p>
            {toast.description && (
              <p className="mt-1 text-sm text-gray-400">
                {toast.description}
              </p>
            )}

            {/* Actions */}
            {(toast.action || toast.link) && (
              <div className="mt-3 flex items-center gap-2">
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      onDismiss();
                    }}
                    className={`
                      text-sm font-medium rounded-lg px-3 py-1.5 transition-colors
                      ${toast.action.variant === 'primary' 
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600' 
                        : toast.action.variant === 'ghost'
                        ? 'text-gray-300 hover:text-white'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                      }
                    `}
                  >
                    {toast.action.label}
                  </button>
                )}
                {toast.link && (
                  <a
                    href={toast.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {toast.link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {toast.dismissible && (
            <button
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {toast.progress && toast.duration && toast.duration !== Infinity && (
        <div className="h-1 bg-gray-800">
          <div
            ref={progressRef}
            className={`h-full w-full ${progressColors[toast.type]}`}
          />
        </div>
      )}
    </motion.div>
  );
}

// ==================== STANDALONE TOAST FUNCTION ====================

let toastFn: ToastContextType | null = null;

export function setToastFunction(fn: ToastContextType) {
  toastFn = fn;
}

export const toast = {
  success: (options: ToastOptions | string) => toastFn?.success(options),
  error: (options: ToastOptions | string) => toastFn?.error(options),
  warning: (options: ToastOptions | string) => toastFn?.warning(options),
  info: (options: ToastOptions | string) => toastFn?.info(options),
  loading: (options: ToastOptions | string) => toastFn?.loading(options),
  dismiss: (id: string) => toastFn?.dismissToast(id),
  dismissAll: () => toastFn?.dismissAll(),
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: ToastOptions | string;
      success: ToastOptions | string | ((data: T) => ToastOptions | string);
      error: ToastOptions | string | ((err: Error) => ToastOptions | string);
    }
  ) => toastFn?.promise(promise, options),
};

export default ToastProvider;
