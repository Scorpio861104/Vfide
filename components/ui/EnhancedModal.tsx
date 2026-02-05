/**
 * Enhanced Modal Component
 * Beautiful modal dialogs with premium animations
 */

'use client';

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

interface EnhancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "default" | "glass" | "gradient";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[95vw]",
};

export function EnhancedModal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
  variant = "default",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: EnhancedModalProps) {
  
  // Close on escape key
  useEffect(() => {
    if (!closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const variantStyles = {
    default: "bg-zinc-900 border border-zinc-800",
    glass: "bg-white/5 backdrop-blur-2xl border border-white/10",
    gradient: "bg-gradient-to-br from-[#16161D] to-zinc-900 border border-zinc-800",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              relative w-full ${sizeStyles[size]}
              ${variantStyles[variant]}
              rounded-2xl shadow-2xl
              max-h-[90vh] overflow-hidden
            `}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="relative z-10 flex items-start justify-between p-6 border-b border-zinc-800">
                <div className="flex-1">
                  {title && (
                    <h2 className="text-2xl font-bold text-zinc-50 mb-1">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-zinc-400">
                      {description}
                    </p>
                  )}
                </div>
                
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {children}
            </div>

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
