"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type ToastVariant = 'default' | 'destructive';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Shadcn-style toast options
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toast: (options: ToastOptions) => void;
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
    const message = options.description || options.title || '';
    showToast(message, type);
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
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
                ${toast.type === 'info' ? 'bg-cyan-400/10 border-cyan-400' : ''}
              `}
            >
              {toast.type === 'success' && <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />}
              {toast.type === 'error' && <XCircle className="text-red-600 shrink-0" size={20} />}
              {toast.type === 'info' && <AlertCircle className="text-cyan-400 shrink-0" size={20} />}
              
              <div className="flex-1 text-zinc-100 text-sm">{toast.message}</div>
              
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
