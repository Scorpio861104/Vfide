"use client";

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

interface LoadingButtonProps {
  isLoading?: boolean;
  isPending?: boolean; // Alias for wagmi compatibility
  loadingText?: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variants = {
  primary: 'bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] hover:shadow-lg hover:shadow-[#00F0FF]/50',
  secondary: 'bg-[#2A2A2F] border border-[#3A3A3F] text-[#F5F3E8] hover:border-[#00F0FF]',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  success: 'bg-green-600 text-white hover:bg-green-500',
};

const sizes = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
};

/**
 * Button with loading state - use for all contract interactions
 */
export function LoadingButton({
  isLoading,
  isPending,
  loadingText,
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  onClick,
  type = 'button',
}: LoadingButtonProps) {
  const loading = isLoading || isPending;

  return (
    <motion.button
      whileHover={!loading && !disabled ? { scale: 1.02 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.98 } : {}}
      disabled={loading || disabled}
      onClick={onClick}
      type={type}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-bold rounded-lg transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} />
          <span>{loadingText || 'Processing...'}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
