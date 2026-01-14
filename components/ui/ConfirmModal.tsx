"use client";

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { ReactNode } from 'react';
import { LoadingButton } from './LoadingButton';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const variantStyles = {
  danger: {
    icon: <AlertTriangle className="text-red-400" size={32} />,
    bg: 'bg-red-600/20 border-red-500',
    button: 'danger' as const,
  },
  warning: {
    icon: <AlertTriangle className="text-yellow-400" size={32} />,
    bg: 'bg-yellow-600/20 border-yellow-500',
    button: 'primary' as const,
  },
  info: {
    icon: <AlertTriangle className="text-[#00F0FF]" size={32} />,
    bg: 'bg-[#00F0FF]/20 border-[#00F0FF]',
    button: 'primary' as const,
  },
};

/**
 * Confirmation modal for important actions
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  }, [onClose, isLoading]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-150 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1A1A1D] border border-[#2A2A2F] rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-16 h-16 ${styles.bg} border rounded-full mb-4`}>
              {styles.icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">{title}</h3>

            {/* Message */}
            <div className="text-[#A0A0A5] mb-6">{message}</div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-[#2A2A2F] border border-[#3A3A3F] text-[#F5F3E8] rounded-lg hover:border-[#00F0FF] transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <LoadingButton
                onClick={onConfirm}
                isLoading={isLoading}
                variant={styles.button}
                className="flex-1"
              >
                {confirmText}
              </LoadingButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
