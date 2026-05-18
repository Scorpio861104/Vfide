'use client';

/**
 * Interactive Feedback Components
 * 
 * Micro-interactions and feedback animations that make
 * the UI feel responsive and alive.
 */

import React, { useState, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { triggerHaptic, playSound, usePrefersReducedMotion } from '@/lib/ux/uxUtils';

// ==================== TYPES ====================

export interface InteractiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  sound?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  disabled?: boolean;
}

export interface SwipeActionProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  threshold?: number;
  className?: string;
}

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

// ==================== INTERACTIVE BUTTON ====================

export const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  haptic = true,
  sound = false,
  className = '',
  type = 'button',
}, ref) => {
  const reducedMotion = usePrefersReducedMotion();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    
    if (haptic) triggerHaptic('light');
    if (sound) playSound('click');
    onClick?.();
  }, [disabled, loading, haptic, sound, onClick]);

  const variants = {
    primary: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-300',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      whileHover={reducedMotion ? {} : { scale: 1.02 }}
      whileTap={reducedMotion ? {} : { scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-xl font-medium
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {/* Press effect overlay */}
      <AnimatePresence>
        {isPressed && !reducedMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
});

InteractiveButton.displayName = 'InteractiveButton';

// ==================== RIPPLE BUTTON ====================

export function RippleButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);
    triggerHaptic('light');
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute w-10 h-10 bg-white rounded-full pointer-events-none"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
          }}
        />
      ))}
    </button>
  );
}

// ==================== TILT CARD ====================

export function TiltCard({
  children,
  className = '',
  intensity = 15,
  disabled = false,
}: TiltCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]));
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]));

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || reducedMotion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reducedMotion ? {} : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={`transform-gpu ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ==================== SWIPE ACTION ====================

export function SwipeAction({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftContent,
  rightContent,
  threshold = 100,
  className = '',
}: SwipeActionProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  const handleDragEnd = () => {
    const currentX = x.get();
    
    if (currentX > threshold && onSwipeRight) {
      triggerHaptic('success');
      onSwipeRight();
    } else if (currentX < -threshold && onSwipeLeft) {
      triggerHaptic('success');
      onSwipeLeft();
    }

    setIsDragging(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left action background */}
      {rightContent && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-y-0 left-0 flex items-center px-4 bg-green-500"
        >
          {rightContent}
        </motion.div>
      )}

      {/* Right action background */}
      {leftContent && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-y-0 right-0 flex items-center px-4 bg-red-500"
        >
          {leftContent}
        </motion.div>
      )}

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        style={{ x }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className={`relative bg-gray-900 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ==================== PULL TO REFRESH ====================

export function PullToRefresh({
  onRefresh,
  children,
  className = '',
}: PullToRefreshProps) {
  const y = useMotionValue(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullThreshold = 80;

  const spinnerOpacity = useTransform(y, [0, pullThreshold], [0, 1]);
  const spinnerRotation = useTransform(y, [0, pullThreshold], [0, 180]);

  const handleDragEnd = async () => {
    if (y.get() > pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Pull indicator */}
      <motion.div
        style={{ opacity: spinnerOpacity }}
        className="absolute top-0 left-1/2 -translate-x-1/2 p-4 z-10"
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : spinnerRotation }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        style={{ y }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ==================== SUCCESS ANIMATION ====================

export function SuccessAnimation({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onAnimationComplete={() => {
            triggerHaptic('success');
            playSound('success');
            onComplete?.();
          }}
          className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== ERROR SHAKE ====================

export function ErrorShake({ 
  children, 
  trigger,
  className = '',
}: { 
  children: React.ReactNode; 
  trigger: boolean;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      animate={trigger && !reducedMotion ? {
        x: [-10, 10, -10, 10, -5, 5, 0],
        transition: { duration: 0.5 },
      } : {}}
      onAnimationComplete={() => {
        if (trigger) triggerHaptic('error');
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== NUMBER TICKER ====================

export function NumberTicker({ 
  value, 
  duration = 1,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: { 
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const springValue = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(springValue, (v) => 
    `${prefix}${v.toFixed(decimals)}${suffix}`
  );

  React.useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}

// ==================== CONFETTI BURST ====================

export function ConfettiBurst({ trigger }: { trigger: boolean }) {
  const colors = ['#00FFB2', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string }>>([]);

  React.useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 30 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
        color: colors[Math.floor(Math.random() * colors.length)] || colors[0] || '#8B5CF6',
      }));
      setParticles(newParticles);
      triggerHaptic('success');

      setTimeout(() => setParticles([]), 1500);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            x: '50%', 
            y: '50%', 
            scale: 1, 
            opacity: 1 
          }}
          animate={{ 
            x: `calc(50% + ${particle.x}vw)`,
            y: `${Math.random() * 100}%`,
            scale: 0,
            opacity: 0,
            rotate: Math.random() * 720,
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: particle.color }}
        />
      ))}
    </div>
  );
}

export default {
  InteractiveButton,
  RippleButton,
  TiltCard,
  SwipeAction,
  PullToRefresh,
  SuccessAnimation,
  ErrorShake,
  NumberTicker,
  ConfettiBurst,
};
