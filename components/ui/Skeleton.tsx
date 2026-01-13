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

/**
 * Skeleton for notification items
 */
export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 bg-[#2A2A2F] rounded-lg">
      <Skeleton width={40} height={40} rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} className="w-3/4" />
        <Skeleton height={14} className="w-full" />
        <Skeleton height={12} className="w-1/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton for notification list
 */
export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={`notification-skeleton-${i}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton for message list
 */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isRight = i % 2 === 0;
        return (
          <div key={i} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[70%] space-y-2">
              <Skeleton 
                height={60} 
                width={Math.random() * 150 + 150}
                rounded="lg"
              />
              <Skeleton height={12} width={100} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Skeleton for friend list
 */
export function FriendListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-[#0F0F14] rounded-lg">
          <Skeleton width={40} height={40} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} className="w-3/5" />
            <Skeleton height={12} className="w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for group list
 */
export function GroupListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-[#0F0F14] border border-[#2A2A2F] rounded-xl">
          <div className="flex items-start gap-3">
            <Skeleton width={48} height={48} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={18} className="w-4/5" />
              <Skeleton height={14} className="w-2/5" />
              <div className="flex gap-2 mt-2">
                <Skeleton width={60} height={20} rounded="md" />
                <Skeleton width={80} height={20} rounded="md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for achievement list
 */
export function AchievementListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-[#0F0F14] border border-[#2A2A2F] rounded-xl">
          <div className="flex items-start gap-3">
            <Skeleton width={48} height={48} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={16} className="w-4/5" />
              <Skeleton height={12} className="w-full" />
              <Skeleton width={120} height={20} rounded="md" className="mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
