'use client';

/**
 * Advanced Loading States
 * 
 * Beautiful, contextual loading states that provide
 * visual feedback and reduce perceived wait time.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/lib/ux/uxUtils';

// ==================== TYPES ====================

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export interface ProgressLoaderProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  className?: string;
}

export interface ContentLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  minLoadTime?: number;
  className?: string;
}

export interface PulseLoaderProps {
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  blur?: boolean;
  className?: string;
}

// ==================== LOADING SPINNER ====================

export function LoadingSpinner({
  size = 'md',
  color = '#00FFB2',
  className = '',
}: LoadingSpinnerProps) {
  const reducedMotion = usePrefersReducedMotion();
  
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const borderSizes = {
    xs: 'border',
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-3',
    xl: 'border-4',
  };

  if (reducedMotion) {
    return (
      <div 
        className={`${sizes[size]} rounded-full ${className}`}
        style={{ borderColor: color, borderWidth: 2 }}
        aria-label="Loading"
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full ${borderSizes[size]} border-transparent animate-spin ${className}`}
      style={{ borderTopColor: color }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ==================== PROGRESS LOADER ====================

export function ProgressLoader({
  progress,
  label,
  showPercentage = true,
  color = '#00FFB2',
  className = '',
}: ProgressLoaderProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2 text-sm">
          {label && <span className="text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-gray-400 font-mono">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ==================== CONTENT LOADER ====================

export function ContentLoader({
  isLoading,
  children,
  skeleton,
  minLoadTime = 300,
  className = '',
}: ContentLoaderProps) {
  const [showContent, setShowContent] = useState(!isLoading);
  const [loadStartTime] = useState(Date.now());

  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - loadStartTime;
      const remaining = Math.max(0, minLoadTime - elapsed);
      
      const timeout = setTimeout(() => {
        setShowContent(true);
      }, remaining);

      return () => clearTimeout(timeout);
    } else {
      setShowContent(false);
      return undefined;
    }
  }, [isLoading, loadStartTime, minLoadTime]);

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {showContent ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {skeleton || <DefaultSkeleton />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2" />
      <div className="h-4 bg-gray-800 rounded animate-pulse w-5/6" />
    </div>
  );
}

// ==================== PULSE LOADER ====================

export function PulseLoader({
  count = 3,
  size = 'md',
  color = '#00FFB2',
  className = '',
}: PulseLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  
  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  const gaps = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  return (
    <div className={`flex items-center ${gaps[size]} ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${sizes[size]} rounded-full`}
          style={{ backgroundColor: color }}
          animate={reducedMotion ? {} : {
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ==================== LOADING OVERLAY ====================

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  blur = true,
  className = '',
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`
            absolute inset-0 z-50 flex items-center justify-center
            ${blur ? 'backdrop-blur-sm' : ''}
            bg-black/50 ${className}
          `}
        >
          <div className="bg-gray-900 rounded-xl p-6 shadow-xl flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-300 text-sm">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== SKELETON VARIANTS ====================

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className={`${sizes[size]} rounded-full bg-gray-800 animate-pulse`} />
  );
}

export function SkeletonButton({ width = 'w-24' }: { width?: string }) {
  return (
    <div className={`${width} h-10 rounded-lg bg-gray-800 animate-pulse`} />
  );
}

export function SkeletonInput() {
  return (
    <div className="w-full h-12 rounded-lg bg-gray-800 animate-pulse" />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-800 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-gray-800 rounded w-1/4 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-800 rounded w-full animate-pulse" />
        <div className="h-3 bg-gray-800 rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-gray-800 rounded w-4/6 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-800 rounded w-2/3 animate-pulse" />
            <div className="h-3 bg-gray-800 rounded w-1/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-gray-800 bg-gray-800/50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-gray-800 last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="flex-1 h-4 bg-gray-800 rounded animate-pulse"
              style={{ animationDelay: `${(rowIndex * cols + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ==================== TRANSACTION LOADING ====================

export function TransactionLoader({ status }: { status: 'pending' | 'confirming' | 'confirmed' | 'failed' }) {
  const messages = {
    pending: 'Waiting for signature...',
    confirming: 'Confirming transaction...',
    confirmed: 'Transaction confirmed!',
    failed: 'Transaction failed',
  };

  const colors = {
    pending: '#F59E0B',
    confirming: '#00FFB2',
    confirmed: '#22C55E',
    failed: '#EF4444',
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {status === 'confirmed' ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
            className="w-8 h-8 text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path d="M5 13l4 4L19 7" />
          </motion.svg>
        </motion.div>
      ) : status === 'failed' ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"
        >
          <span className="text-2xl">✕</span>
        </motion.div>
      ) : (
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-gray-700"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{ borderTopColor: colors[status] }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
      <p className="text-gray-300 text-center">{messages[status]}</p>
    </div>
  );
}

export default {
  LoadingSpinner,
  ProgressLoader,
  ContentLoader,
  PulseLoader,
  LoadingOverlay,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  TransactionLoader,
};
