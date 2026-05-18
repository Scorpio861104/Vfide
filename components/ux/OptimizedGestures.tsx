'use client';

/**
 * Optimized Gestures
 * 
 * Touch-optimized gesture handlers for mobile UX.
 */

import React, { useState, useCallback, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';

// ==================== TYPES ====================

export interface SwipeConfig {
  threshold?: number;
  velocityThreshold?: number;
}

// ==================== SWIPEABLE CARD ====================

export interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 100,
  className = '',
  leftAction,
  rightAction,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  
  // Action visibility
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    
    if (Math.abs(offset.y) > threshold || Math.abs(velocity.y) > 500) {
      if (offset.y > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left action indicator */}
      {leftAction && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center pl-4"
          style={{ opacity: rightOpacity }}
        >
          {leftAction}
        </motion.div>
      )}
      
      {/* Right action indicator */}
      {rightAction && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center pr-4"
          style={{ opacity: leftOpacity }}
        >
          {rightAction}
        </motion.div>
      )}
      
      {/* Card */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate, opacity }}
        className="relative z-10 cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ==================== LONG PRESS ====================

export interface LongPressProps {
  children: ReactNode;
  onLongPress: () => void;
  duration?: number;
  className?: string;
  disabled?: boolean;
}

export function LongPress({
  children,
  onLongPress,
  duration = 500,
  className = '',
  disabled = false,
}: LongPressProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const startPress = useCallback(() => {
    if (disabled) return;
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressing(false);
    }, duration);
  }, [disabled, duration, onLongPress]);

  const endPress = useCallback(() => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <motion.div
      className={className}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      animate={{ scale: isPressing ? 0.95 : 1 }}
    >
      {children}
      {/* Progress indicator */}
      {isPressing && (
        <motion.div
          className="absolute inset-0 border-2 border-blue-500 rounded-inherit pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
        >
          <motion.div
            className="absolute inset-0 bg-blue-500/10"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: duration / 1000 }}
            style={{ transformOrigin: 'left' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== PINCH TO ZOOM ====================

export interface PinchZoomProps {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export function PinchZoom({
  children,
  minScale = 1,
  maxScale = 4,
  className = '',
}: PinchZoomProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      // Calculate distance between touches
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (!touch1 || !touch2) return;
      
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      // Calculate center
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      if (lastDistance.current !== null && lastCenter.current !== null) {
        const scaleChange = distance / lastDistance.current;
        const newScale = Math.min(maxScale, Math.max(minScale, scale * scaleChange));
        setScale(newScale);

        // Pan with pinch
        const dx = centerX - lastCenter.current.x;
        const dy = centerY - lastCenter.current.y;
        setPosition(prev => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      }

      lastDistance.current = distance;
      lastCenter.current = { x: centerX, y: centerY };
    }
  }, [scale, minScale, maxScale]);

  const handleTouchEnd = useCallback(() => {
    lastDistance.current = null;
    lastCenter.current = null;
  }, []);

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  }, [scale]);

  return (
    <div
      className={`overflow-hidden touch-none ${className}`}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleTap}
    >
      <motion.div
        animate={{ scale, x: position.x, y: position.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ==================== DRAG TO REORDER ====================

export interface DragReorderProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  itemClassName?: string;
}

export function DragReorder<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  className = '',
  itemClassName = '',
}: DragReorderProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (overIndex: number) => {
    if (draggedIndex === null || draggedIndex === overIndex) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    if (draggedItem !== undefined) {
      newItems.splice(overIndex, 0, draggedItem);
      onReorder(newItems);
      setDraggedIndex(overIndex);
    }
  };

  return (
    <div className={className}>
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor(item)}
          layout
          layoutId={keyExtractor(item)}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragStart={() => handleDragStart(index)}
          onDragEnd={handleDragEnd}
          onDragOver={() => handleDragOver(index)}
          className={`${itemClassName} ${draggedIndex === index ? 'z-10 shadow-lg' : ''}`}
          animate={{
            scale: draggedIndex === index ? 1.02 : 1,
            opacity: draggedIndex === index ? 0.9 : 1,
          }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </div>
  );
}

// ==================== DOUBLE TAP ====================

export interface DoubleTapProps {
  children: ReactNode;
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delay?: number;
  className?: string;
}

export function DoubleTap({
  children,
  onDoubleTap,
  onSingleTap,
  delay = 300,
  className = '',
}: DoubleTapProps) {
  const lastTapRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delay) {
      // Double tap
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onDoubleTap();
    } else {
      // Potential single tap
      timeoutRef.current = setTimeout(() => {
        onSingleTap?.();
      }, delay);
    }

    lastTapRef.current = now;
  }, [delay, onDoubleTap, onSingleTap]);

  return (
    <div className={className} onClick={handleTap}>
      {children}
    </div>
  );
}

// ==================== MOMENTUM SCROLL ====================

export interface MomentumScrollProps {
  children: ReactNode;
  className?: string;
  friction?: number;
}

export function MomentumScroll({ 
  children, 
  className = '',
  friction = 0.92,
}: MomentumScrollProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const velocity = useRef(0);
  const animationFrame = useRef<number | null>(null);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    velocity.current = info.velocity.x;
    
    const animate = () => {
      velocity.current *= friction;
      
      if (Math.abs(velocity.current) > 0.5) {
        x.set(x.get() + velocity.current * 0.016); // 60fps
        animationFrame.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  React.useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <motion.div
        drag="x"
        style={{ x }}
        onDragEnd={handleDragEnd}
        dragConstraints={containerRef}
        dragElastic={0.1}
        className="flex"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default SwipeableCard;
