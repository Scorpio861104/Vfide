'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastVariant = 'default' | 'destructive';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
}

// Shadcn-style toast options
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toast: (options: ToastOptions) => void;
  error: (message: string, options?: { description?: string; action?: ToastAction; duration?: number }) => void;
  success: (message: string, options?: { description?: string; duration?: number }) => void;
  warning: (message: string, options?: { description?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(7);
    const toastItem: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, toastItem]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  // Shadcn-compatible toast function
  const toast = useCallback((options: ToastOptions) => {
    const type: ToastType = options.variant === 'destructive' ? 'error' : 'success';
    const message = options.title || options.description || '';
    const description = options.title ? options.description : undefined;
    const id = Math.random().toString(36).substring(7);
    
    const toastItem: Toast = { 
      id, 
      type, 
      message, 
      description,
      duration: options.duration ?? 5000,
      action: options.action
    };
    
    setToasts((prev) => [...prev, toastItem]);

    if (toastItem.duration! > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toastItem.duration);
    }
  }, []);

  // Convenience methods for common toast types
  const error = useCallback((message: string, options?: { description?: string; action?: ToastAction; duration?: number }) => {
    toast({
      title: message,
      description: options?.description,
      variant: 'destructive',
      action: options?.action,
      duration: options?.duration ?? 7000 // Longer duration for errors
    });
  }, [toast]);

  const success = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    toast({
      title: message,
      description: options?.description,
      variant: 'default',
      duration: options?.duration ?? 4000 // Shorter for success
    });
  }, [toast]);

  const warning = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    const id = Math.random().toString(36).substring(7);
    const toastItem: Toast = {
      id,
      type: 'warning',
      message,
      description: options?.description,
      duration: options?.duration ?? 6000
    };
    
    setToasts((prev) => [...prev, toastItem]);

    if (toastItem.duration! > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toastItem.duration);
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, toast, error, success, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, x: 100 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.2 }}
              className={`
                p-4 rounded-lg shadow-lg border flex items-start gap-3
                ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500' : ''}
                ${toast.type === 'error' ? 'bg-red-600/10 border-red-600' : ''}
                ${toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500' : ''}
                ${toast.type === 'info' ? 'bg-cyan-400/10 border-cyan-400' : ''}
              `}
            >
              {toast.type === 'success' && <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />}
              {toast.type === 'error' && <XCircle className="text-red-600 shrink-0" size={20} />}
              {toast.type === 'warning' && <AlertCircle className="text-orange-500 shrink-0" size={20} />}
              {toast.type === 'info' && <AlertCircle className="text-cyan-400 shrink-0" size={20} />}
              
              <div className="flex-1">
                <div className="text-zinc-100 text-sm font-medium">{toast.message}</div>
                {toast.description && (
                  <div className="text-zinc-400 text-xs mt-1">{toast.description}</div>
                )}
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action!.onClick();
                      removeToast(toast.id);
                    }}
                    className="mt-2 px-3 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
