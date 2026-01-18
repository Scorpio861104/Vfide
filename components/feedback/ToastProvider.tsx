'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Loader2 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  loading: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    // Use crypto.randomUUID if available, fallback to timestamp+random
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `toast-${crypto.randomUUID()}`
      : `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };

    setToasts(prev => {
      const updated = [...prev, newToast];
      return updated.slice(-maxToasts); // Keep only last N toasts
    });

    // Auto-dismiss after duration (unless it's a loading toast)
    if (toast.type !== 'loading' && toast.duration !== 0) {
      const duration = toast.duration || 5000;
      setTimeout(() => hideToast(id), duration);
    }

    return id;
  }, [maxToasts, hideToast]);

  const success = useCallback((title: string, message?: string) => {
    return showToast({ type: 'success', title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    return showToast({ type: 'error', title, message });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    return showToast({ type: 'warning', title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    return showToast({ type: 'info', title, message });
  }, [showToast]);

  const loading = useCallback((title: string, message?: string) => {
    return showToast({ type: 'loading', title, message, duration: 0 });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, success, error, warning, info, loading }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#10B981]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#EF4444]" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-[#F59E0B]" />;
      case 'info':
        return <Info className="w-5 h-5 text-[#3B82F6]" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-[#00F0FF] animate-spin" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-[#10B981]/30';
      case 'error':
        return 'border-[#EF4444]/30';
      case 'warning':
        return 'border-[#F59E0B]/30';
      case 'info':
        return 'border-[#3B82F6]/30';
      case 'loading':
        return 'border-[#00F0FF]/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className="pointer-events-auto"
    >
      <div className={`bg-[#1A1A2E] border ${getBorderColor()} rounded-xl shadow-lg p-4 backdrop-blur-sm`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#F5F3E8] mb-1">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-xs text-[#A0A0A5] leading-relaxed">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-xs font-semibold text-[#00F0FF] hover:underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {toast.type !== 'loading' && (
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
