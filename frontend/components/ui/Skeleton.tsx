"use client";

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Skeleton loader for content placeholders
 */
export function Skeleton({ 
  className = '', 
  width, 
  height,
  rounded = 'md' 
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`bg-[#2A2A2F] ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={16} 
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for cards
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#1A1A1D] border border-[#2A2A2F] rounded-xl p-6 ${className}`}>
      <Skeleton height={24} className="w-1/3 mb-4" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 mt-4">
        <Skeleton height={40} className="w-24" rounded="lg" />
        <Skeleton height={40} className="w-24" rounded="lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for stat boxes
 */
export function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#2A2A2F] rounded-xl p-4 ${className}`}>
      <Skeleton height={14} className="w-1/2 mb-2" />
      <Skeleton height={32} className="w-3/4" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function SkeletonTable({ rows = 5, cols = 4, className = '' }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-3 bg-[#2A2A2F] rounded-lg">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={16} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-3 border-b border-[#2A2A2F]">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
