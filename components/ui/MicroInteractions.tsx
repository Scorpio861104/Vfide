/**
 * Micro-Interactions Library
 * 
 * Small delightful animations that improve perceived quality and user feedback
 */

'use client';

import { motion, AnimatePresence, Variants, HTMLMotionProps } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';

// ============ BUTTON INTERACTIONS ============

interface InteractiveButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'bounce' | 'pulse' | 'glow' | 'ripple' | 'scale';
}

/**
 * Button with micro-interaction effect
 */
export const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ children, variant = 'scale', className = '', ...props }, ref) => {
    const variants: Record<string, Variants> = {
      bounce: {
        tap: { scale: 0.95, y: 2 },
        hover: { scale: 1.02, y: -2 },
      },
      pulse: {
        tap: { scale: 0.98 },
        hover: { scale: 1.05 },
      },
      glow: {
        tap: { scale: 0.98 },
        hover: { 
          scale: 1.02,
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
        },
      },
      scale: {
        tap: { scale: 0.97 },
        hover: { scale: 1.03 },
      },
      ripple: {
        tap: { scale: 0.98 },
        hover: { scale: 1.01 },
      },
    };

    return (
      <motion.button
        ref={ref}
        className={className}
        variants={variants[variant]}
        whileHover="hover"
        whileTap="tap"
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

InteractiveButton.displayName = 'InteractiveButton';

// ============ SUCCESS ANIMATION ============

interface SuccessCheckProps {
  show: boolean;
  size?: number;
  className?: string;
}

/**
 * Animated success checkmark
 */
export function SuccessCheck({ show, size = 60, className = '' }: SuccessCheckProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`relative ${className}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{ width: size, height: size }}
        >
          {/* Circle */}
          <motion.svg
            viewBox="0 0 52 52"
            className="w-full h-full"
          >
            <motion.circle
              cx="26"
              cy="26"
              r="23"
              fill="none"
              stroke="#50C878"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {/* Checkmark */}
            <motion.path
              fill="none"
              stroke="#50C878"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 27l7.5 7.5L38 18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============ NUMBER COUNTER ============

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * Smoothly animated number counter
 */
export function AnimatedNumber({
  value,
  duration = 1,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedNumberProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {prefix}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration }}
        >
          {value.toFixed(decimals)}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// ============ LIKE HEART ANIMATION ============

interface LikeHeartProps {
  liked: boolean;
  onClick: () => void;
  size?: number;
  className?: string;
}

/**
 * Animated like heart with burst effect
 */
export function LikeHeart({ liked, onClick, size = 24, className = '' }: LikeHeartProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative ${className}`}
      whileTap={{ scale: 0.9 }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        initial={false}
        animate={{
          scale: liked ? [1, 1.3, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={liked ? '#EF4444' : 'none'}
          stroke={liked ? '#EF4444' : '#6B6B78'}
          strokeWidth="2"
          initial={false}
          animate={{
            fill: liked ? '#EF4444' : 'rgba(0,0,0,0)',
          }}
        />
      </motion.svg>
      
      {/* Burst particles */}
      <AnimatePresence>
        {liked && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-red-400 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                initial={{ scale: 0, x: '-50%', y: '-50%' }}
                animate={{
                  scale: [0, 1, 0],
                  x: `${Math.cos((i * 60 * Math.PI) / 180) * 20 - 50}%`,
                  y: `${Math.sin((i * 60 * Math.PI) / 180) * 20 - 50}%`,
                }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.4 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ============ NOTIFICATION BADGE ============

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

/**
 * Animated notification badge
 */
export function NotificationBadge({ count, max = 99, className = '' }: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          className={`
            inline-flex items-center justify-center px-1.5
            text-xs font-bold text-white bg-red-500 rounded-full
            ${className}
          `}
          style={{ minWidth: '18px', height: '18px' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          key={count}
        >
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            key={displayCount}
          >
            {displayCount}
          </motion.span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ============ SKELETON PULSE ============

interface SkeletonPulseProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Elegant skeleton pulse wrapper
 */
export function SkeletonPulse({ className = '', children }: SkeletonPulseProps) {
  return (
    <motion.div
      className={`bg-[#2A2A2F] rounded-lg ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// ============ CONFETTI BURST ============

interface ConfettiBurstProps {
  trigger: boolean;
  colors?: string[];
  particleCount?: number;
}

/**
 * Celebratory confetti burst effect
 */
export function ConfettiBurst({ 
  trigger, 
  colors = ['#00F0FF', '#50C878', '#F59E0B', '#EF4444', '#8B5CF6'],
  particleCount = 20,
}: ConfettiBurstProps) {
  return (
    <AnimatePresence>
      {trigger && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(particleCount)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3"
              style={{
                left: '50%',
                top: '50%',
                backgroundColor: colors[i % colors.length],
                borderRadius: i % 2 === 0 ? '50%' : '0%',
              }}
              initial={{ 
                scale: 0,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                scale: [0, 1, 0.5],
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400 + 200, // Gravity pull down
                rotate: Math.random() * 720,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ============ TOOLTIP WITH ANIMATION ============

interface AnimatedTooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Tooltip with smooth animation
 */
export function AnimatedTooltip({
  content,
  children,
  position = 'top',
  className = '',
}: AnimatedTooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const initialY = position === 'top' ? 5 : position === 'bottom' ? -5 : 0;
  const initialX = position === 'left' ? 5 : position === 'right' ? -5 : 0;

  return (
    <motion.div 
      className={`relative inline-block group ${className}`}
      whileHover="hover"
    >
      {children}
      <motion.div
        className={`
          absolute ${positionClasses[position]}
          px-3 py-1.5 bg-[#1F1F2A] border border-[#2A2A2F] rounded-lg
          text-sm text-[#F5F3E8] whitespace-nowrap z-50
          opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto
        `}
        initial={{ opacity: 0, y: initialY, x: initialX }}
        variants={{
          hover: { opacity: 1, y: 0, x: 0 },
        }}
        transition={{ duration: 0.2 }}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}

export default {
  InteractiveButton,
  SuccessCheck,
  AnimatedNumber,
  LikeHeart,
  NotificationBadge,
  SkeletonPulse,
  ConfettiBurst,
  AnimatedTooltip,
};
