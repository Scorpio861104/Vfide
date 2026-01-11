/**
 * Enhanced Toast Notifications
 * Beautiful toast messages with premium animations
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  icon?: ReactNode;
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const toastStyles = {
  success: {
    bg: "bg-gradient-to-r from-emerald-500/10 to-green-500/10",
    border: "border-emerald-500/50",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
  },
  error: {
    bg: "bg-gradient-to-r from-red-500/10 to-rose-500/10",
    border: "border-red-500/50",
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.3)]",
  },
  info: {
    bg: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10",
    border: "border-[#00F0FF]/50",
    icon: <Info className="w-5 h-5 text-[#00F0FF]" />,
    glow: "shadow-[0_0_30px_rgba(0,240,255,0.3)]",
  },
  warning: {
    bg: "bg-gradient-to-r from-yellow-500/10 to-orange-500/10",
    border: "border-yellow-500/50",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    glow: "shadow-[0_0_30px_rgba(234,179,8,0.3)]",
  },
};

export function EnhancedToast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const style = toastStyles[type];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onClose(id);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`
        relative w-96 p-4 rounded-xl backdrop-blur-xl border
        ${style.bg} ${style.border} ${style.glow}
        overflow-hidden
      `}
    >
      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#00F0FF] to-[#0080FF]"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />

      {/* Content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {style.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[#F8F8FC]">{title}</h4>
          {message && (
            <p className="mt-1 text-sm text-[#A8A8B3]">{message}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 text-[#8A8A8F] hover:text-[#F8F8FC] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

// Toast container and manager
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <EnhancedToast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook to use toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showToast,
    closeToast,
    success: (title: string, message?: string) => showToast({ type: "success", title, message }),
    error: (title: string, message?: string) => showToast({ type: "error", title, message }),
    info: (title: string, message?: string) => showToast({ type: "info", title, message }),
    warning: (title: string, message?: string) => showToast({ type: "warning", title, message }),
  };
}
