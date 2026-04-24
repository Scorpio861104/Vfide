'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Loader2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useChainId } from 'wagmi';
import { getExplorerLink } from '@/components/ui/EtherscanLink';

// ==================== TYPES ====================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'link';
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
  progress?: boolean;
  txHash?: string;
  icon?: React.ReactNode;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearAll: () => void;
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: Error) => string) }
  ) => Promise<T>;
}

// ==================== CONTEXT ====================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useAdvancedToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAdvancedToast must be used within a ToastProvider');
  }
  return context;
}

// ==================== UTILITIES ====================

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getToastIcon = (type: ToastType, icon?: React.ReactNode) => {
  if (icon) return icon;
  
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-400" />;
    case 'loading':
    case 'promise':
      return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />;
    default:
      return <Info className="w-5 h-5 text-gray-400" />;
  }
};

const getToastStyles = (type: ToastType) => {
  const base = 'bg-zinc-900 border shadow-2xl';
  
  switch (type) {
    case 'success':
      return `${base} border-green-500/30`;
    case 'error':
      return `${base} border-red-500/30`;
    case 'warning':
      return `${base} border-yellow-500/30`;
    case 'info':
      return `${base} border-blue-500/30`;
    case 'loading':
    case 'promise':
      return `${base} border-cyan-500/30`;
    default:
      return `${base} border-zinc-700`;
  }
};

// ==================== TOAST COMPONENT ====================

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [progress, setProgress] = useState(100);
  const [copied, setCopied] = useState(false);
  const chainId = useChainId();

  useEffect(() => {
    if (!toast.progress || toast.type === 'loading' || toast.type === 'promise') return;
    
    const duration = toast.duration || 5000;
    const interval = 50;
    const step = (100 * interval) / duration;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration, toast.progress, toast.type]);

  useEffect(() => {
    if (toast.type === 'loading' || toast.type === 'promise') return;
    if (toast.duration === 0) return; // Persistent toast
    
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, toast.type, onRemove]);

  const handleCopyTxHash = async () => {
    if (!toast.txHash) return;
    await navigator.clipboard.writeText(toast.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`
        relative overflow-hidden rounded-xl
        ${getToastStyles(toast.type)}
        w-90 max-w-[calc(100vw-32px)]
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getToastIcon(toast.type, toast.icon)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-sm text-zinc-400">{toast.description}</p>
            )}

            {/* Transaction Hash */}
            {toast.txHash && (
              <div className="mt-2 flex items-center gap-2">
                <code className="text-xs text-cyan-400 font-mono truncate max-w-45">
                  {toast.txHash}
                </code>
                <button
                  onClick={handleCopyTxHash}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Copy transaction hash"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-500" />
                  )}
                </button>
                <a
                  href={getExplorerLink(chainId, toast.txHash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </div>
            )}

            {/* Action Button */}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className={`
                  mt-3 text-sm font-medium flex items-center gap-1 transition-colors
                  ${toast.action.variant === 'primary' 
                    ? 'text-cyan-400 hover:text-cyan-300' 
                    : toast.action.variant === 'link'
                    ? 'text-zinc-400 hover:text-zinc-300 underline'
                    : 'text-zinc-300 hover:text-white'
                  }
                `}
              >
                {toast.action.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dismiss Button */}
          {toast.dismissible !== false && toast.type !== 'loading' && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {toast.progress && toast.type !== 'loading' && toast.type !== 'promise' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            className={`
              h-full transition-none
              ${toast.type === 'success' ? 'bg-green-500' :
                toast.type === 'error' ? 'bg-red-500' :
                toast.type === 'warning' ? 'bg-yellow-500' :
                'bg-cyan-500'
              }
            `}
          />
        </div>
      )}
    </motion.div>
  );
}

// ==================== PROVIDER ====================

export function AdvancedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) => 
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const promise = useCallback(async <T,>(
    promiseValue: Promise<T>,
    messages: { 
      loading: string; 
      success: string | ((data: T) => string); 
      error: string | ((err: Error) => string);
    }
  ): Promise<T> => {
    const id = addToast({
      type: 'loading',
      title: messages.loading,
      dismissible: false,
    });

    try {
      const data = await promiseValue;
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(data) 
        : messages.success;
      
      updateToast(id, {
        type: 'success',
        title: successMessage,
        dismissible: true,
        duration: 5000,
      });
      
      return data;
    } catch (err) {
      const errorMessage = typeof messages.error === 'function'
        ? messages.error(err as Error)
        : messages.error;
      
      updateToast(id, {
        type: 'error',
        title: errorMessage,
        description: err instanceof Error ? err.message : undefined,
        dismissible: true,
        duration: 8000,
      });
      
      throw err;
    }
  }, [addToast, updateToast]);

  // Group toasts by position
  const positions = ['top-right', 'top-center', 'bottom-right', 'bottom-center'] as const;
  const toastsByPosition = positions.reduce((acc, pos) => {
    acc[pos] = toasts.filter((t) => (t.position || 'top-right') === pos);
    return acc;
  }, {} as Record<typeof positions[number], Toast[]>);

  const positionStyles: Record<typeof positions[number], string> = {
    'top-right': 'top-4 right-4 items-end',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast, clearAll, promise }}>
      {children}
      
      {/* Toast Containers */}
      {positions.map((position) => (
        <div
          key={position}
          className={`fixed z-[100] flex flex-col gap-3 pointer-events-none ${positionStyles[position]}`}
        >
          <AnimatePresence mode="popLayout">
            {toastsByPosition[position].map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
              </div>
            ))}
          </AnimatePresence>
        </div>
      ))}
    </ToastContext.Provider>
  );
}

// ==================== CONVENIENCE FUNCTIONS ====================

export function createToastHelpers(addToast: ToastContextValue['addToast']) {
  return {
    success: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'success', title, progress: true, ...options }),
    
    error: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'error', title, duration: 8000, ...options }),
    
    warning: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'warning', title, progress: true, ...options }),
    
    info: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'info', title, progress: true, ...options }),
    
    loading: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      addToast({ type: 'loading', title, dismissible: false, ...options }),
    
    tx: (title: string, txHash: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'txHash'>>) =>
      addToast({ type: 'success', title, txHash, duration: 10000, ...options }),
  };
}

export default AdvancedToastProvider;
