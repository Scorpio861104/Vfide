/**
 * Progress Indicator Components
 * 
 * Smooth, animated progress indicators for better perceived performance
 */

'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
  indeterminate?: boolean;
}

const VARIANTS = {
  default: 'bg-[#00F0FF]',
  success: 'bg-[#50C878]',
  warning: 'bg-[#F59E0B]',
  error: 'bg-[#EF4444]',
  gradient: 'bg-gradient-to-r from-[#00F0FF] to-[#8B5CF6]',
};

const SIZES = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

/**
 * Smooth animated progress bar
 */
export function ProgressBar({
  value,
  className = '',
  variant = 'default',
  size = 'md',
  showValue = false,
  animated = true,
  indeterminate = false,
}: ProgressBarProps) {
  // Spring animation for smooth value changes
  const springValue = useSpring(value, { stiffness: 100, damping: 20 });
  const width = useTransform(springValue, (v) => `${Math.min(100, Math.max(0, v))}%`);

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  if (indeterminate) {
    return (
      <div className={`w-full ${SIZES[size]} bg-[#2A2A2F] rounded-full overflow-hidden ${className}`}>
        <motion.div
          className={`h-full ${VARIANTS[variant]} rounded-full`}
          initial={{ x: '-100%', width: '40%' }}
          animate={{ x: '250%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`w-full ${SIZES[size]} bg-[#2A2A2F] rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full ${VARIANTS[variant]} rounded-full ${animated ? '' : ''}`}
          style={{ width: animated ? width : `${value}%` }}
        />
      </div>
      {showValue && (
        <motion.span 
          className="absolute right-0 -top-6 text-xs text-[#A0A0A5]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(value)}%
        </motion.span>
      )}
    </div>
  );
}

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  className?: string;
}

const STROKE_COLORS = {
  default: '#00F0FF',
  success: '#50C878',
  warning: '#F59E0B',
  error: '#EF4444',
};

export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 4,
  variant = 'default',
  showValue = true,
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const springValue = useSpring(value, { stiffness: 100, damping: 20 });
  const strokeDashoffset = useTransform(
    springValue,
    (v) => circumference - (Math.min(100, Math.max(0, v)) / 100) * circumference
  );

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2A2A2F"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={STROKE_COLORS[variant]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      {showValue && (
        <span className="absolute text-sm font-medium text-[#F5F3E8]">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

/**
 * Step progress indicator for multi-step flows
 */
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  labels,
  className = '',
}: StepProgressProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        
        return (
          <div key={index} className="flex items-center">
            {/* Step circle */}
            <motion.div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-colors duration-300
                ${isCompleted ? 'bg-[#50C878] text-white' : ''}
                ${isCurrent ? 'bg-[#00F0FF] text-[#0A0A0F]' : ''}
                ${!isCompleted && !isCurrent ? 'bg-[#2A2A2F] text-[#6B6B78]' : ''}
              `}
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {isCompleted ? (
                <svg className="w-4 h-4\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNumber
              )}
            </motion.div>
            
            {/* Label */}
            {labels && labels[index] && (
              <span className={`
                ml-2 text-xs hidden sm:block
                ${isCurrent ? 'text-[#F5F3E8]' : 'text-[#6B6B78]'}
              `}>
                {labels[index]}
              </span>
            )}
            
            {/* Connector line */}
            {index < totalSteps - 1 && (
              <div className="flex-1 mx-3 h-0.5 min-w-10">
                <motion.div
                  className="h-full bg-[#50C878] rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isCompleted ? 1 : 0 }}
                  style={{ originX: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <div 
                  className={`h-full -mt-0.5 rounded-full ${isCompleted ? 'bg-[#50C878]' : 'bg-[#2A2A2F]'}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Skeleton with shimmer effect for loading states
 */
interface ShimmerSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function ShimmerSkeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: ShimmerSkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`
        relative overflow-hidden bg-[#2A2A2F] ${roundedClasses[rounded]} ${className}
      `}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

/**
 * Typing indicator for chat/loading states
 */
export function TypingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-[#00F0FF] rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export default {
  ProgressBar,
  CircularProgress,
  StepProgress,
  ShimmerSkeleton,
  TypingIndicator,
};
