'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'profile' | 'badge' | 'text';
  count?: number;
  className?: string;
}

/**
 * Animated loading skeleton for better perceived performance
 * Shows content structure while data loads
 */
export function LoadingSkeleton({ variant = 'card', count = 1, className = '' }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return skeletons.map((i) => (
          <SkeletonCard key={i} />
        ));
      
      case 'list':
        return skeletons.map((i) => (
          <SkeletonListItem key={i} />
        ));
      
      case 'table':
        return <SkeletonTable rows={count} />;
      
      case 'profile':
        return <SkeletonProfile />;
      
      case 'badge':
        return skeletons.map((i) => (
          <SkeletonBadge key={i} />
        ));
      
      case 'text':
        return skeletons.map((i) => (
          <SkeletonText key={i} />
        ));
      
      default:
        return null;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
}

// Skeleton components
function SkeletonCard() {
  return (
    <div className="bg-[#1A1A2E] border border-[#2A2A3F] rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#2A2A3F] rounded-lg" />
        <div className="flex-1">
          <div className="h-5 bg-[#2A2A3F] rounded w-3/4 mb-2" />
          <div className="h-4 bg-[#2A2A3F] rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-[#2A2A3F] rounded w-full" />
        <div className="h-3 bg-[#2A2A3F] rounded w-5/6" />
      </div>
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 bg-[#2A2A3F] rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-[#2A2A3F] rounded w-1/3 mb-2" />
        <div className="h-3 bg-[#2A2A3F] rounded w-1/4" />
      </div>
      <div className="h-8 w-20 bg-[#2A2A3F] rounded" />
    </div>
  );
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-[#1A1A2E] border border-[#2A2A3F] rounded-t-xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-[#2A2A3F] rounded" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 bg-[#1A1A2E] border border-[#2A2A3F]">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="h-4 bg-[#2A2A3F] rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonProfile() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-[#2A2A3F] rounded-full" />
        <div className="flex-1">
          <div className="h-6 bg-[#2A2A3F] rounded w-1/3 mb-3" />
          <div className="h-4 bg-[#2A2A3F] rounded w-1/2" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1A1A2E] border border-[#2A2A3F] rounded-xl p-4">
            <div className="h-8 bg-[#2A2A3F] rounded w-full mb-2" />
            <div className="h-3 bg-[#2A2A3F] rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonBadge() {
  return (
    <div className="bg-[#1A1A2E] border border-[#2A2A3F] rounded-xl p-4 animate-pulse">
      <div className="w-16 h-16 bg-[#2A2A3F] rounded-lg mx-auto mb-3" />
      <div className="h-4 bg-[#2A2A3F] rounded w-3/4 mx-auto mb-2" />
      <div className="h-3 bg-[#2A2A3F] rounded w-1/2 mx-auto" />
    </div>
  );
}

function SkeletonText() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-[#2A2A3F] rounded w-full mb-2" />
      <div className="h-4 bg-[#2A2A3F] rounded w-5/6" />
    </div>
  );
}

/**
 * Pulsing shimmer effect for loading states
 */
export function ShimmerEffect({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-transparent via-[#00F0FF]/10 to-transparent ${className}`}
      animate={{
        x: ['-100%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
