"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, Loader2, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
type ToastVariant = 'default' | 'destructive';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

// Shadcn-style toast options
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => string;
  toast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => Promise<T>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000, action?: ToastAction): string => {
    const id = Math.random().toString(36).substring(7);
    const toastItem: Toast = { id, type, message, duration, action };
    
    setToasts((prev) => [...prev, toastItem]);

    // Loading toasts don't auto-dismiss
    if (duration > 0 && type !== 'loading') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Promise helper for async operations - shows loading then success/error
  const promiseToast = useCallback(async <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }): Promise<T> => {
    const id = showToast(messages.loading, 'loading', 0);
    try {
      const result = await promise;
      dismissToast(id);
      showToast(messages.success, 'success');
      return result;
    } catch (err) {
      dismissToast(id);
      showToast(messages.error, 'error');
      throw err;
    }
  }, [showToast, dismissToast]);

  // Shadcn-compatible toast function
  const toast = useCallback((options: ToastOptions) => {
    const type: ToastType = options.variant === 'destructive' ? 'error' : 'success';
    const message = options.description || options.title || '';
    showToast(message, type);
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, toast, dismissToast, promise: promiseToast }}>
      {children}
      
      {/* Toast Container - centered on mobile, right-aligned on desktop */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-md mx-4 sm:mx-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`
                p-4 rounded-lg shadow-lg border flex items-start gap-3
                ${toast.type === 'success' ? 'bg-[#50C878]/10 border-[#50C878]' : ''}
                ${toast.type === 'error' ? 'bg-[#C41E3A]/10 border-[#C41E3A]' : ''}
                ${toast.type === 'info' ? 'bg-[#00F0FF]/10 border-[#00F0FF]' : ''}
                ${toast.type === 'warning' ? 'bg-[#F59E0B]/10 border-[#F59E0B]' : ''}
                ${toast.type === 'loading' ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]' : ''}
              `}
            >
              {toast.type === 'success' && <CheckCircle2 className="text-[#50C878] shrink-0" size={20} />}
              {toast.type === 'error' && <XCircle className="text-[#C41E3A] shrink-0" size={20} />}
              {toast.type === 'info' && <AlertCircle className="text-[#00F0FF] shrink-0" size={20} />}
              {toast.type === 'warning' && <AlertTriangle className="text-[#F59E0B] shrink-0" size={20} />}
              {toast.type === 'loading' && <Loader2 className="text-[#8B5CF6] shrink-0 animate-spin" size={20} />}
              
              <div className="flex-1">
                <div className="text-[#F5F3E8] text-sm">{toast.message}</div>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="mt-2 text-xs font-medium text-[#00F0FF] hover:text-[#00F0FF]/80 transition-colors"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
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
