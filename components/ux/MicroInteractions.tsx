'use client';

/**
 * Micro-interactions
 * 
 * Small, delightful animations that respond to user actions.
 * These create a more responsive and engaging experience.
 */

import React, { useState, useCallback, type ReactNode } from 'react';
import { motion, useSpring, useTransform, type MotionValue } from 'framer-motion';

// ==================== MAGNETIC EFFECT ====================

export interface MagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export function Magnetic({ children, strength = 0.3, className = '' }: MagneticProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    setPosition({ x, y });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}

// ==================== BOUNCE BUTTON ====================

export interface BounceButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function BounceButton({ children, onClick, className = '', disabled = false }: BounceButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

// ==================== ELASTIC SLIDER ====================

export interface ElasticSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function ElasticSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
}: ElasticSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const springValue = useSpring(percentage, { stiffness: 300, damping: 30 });

  return (
    <div className={`relative h-6 flex items-center ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>  onChange(Number(e.target.value))}
        className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
      />
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: springValue as unknown as MotionValue<string> }}
        />
      </div>
      <motion.div
        className="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md"
        style={{ 
          left: `calc(${percentage}% - 10px)`,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      />
    </div>
  );
}

// ==================== GLOW CARD ====================

export interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({ children, className = '', glowColor = 'rgba(59, 130, 246, 0.5)' }: GlowCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 40%)`,
        }}
        transition={{ duration: 0.2 }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ==================== MORPH TEXT ====================

export interface MorphTextProps {
  texts: string[];
  interval?: number;
  className?: string;
}

export function MorphText({ texts, interval = 3000, className = '' }: MorphTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <div className={`relative ${className}`}>
      {texts.map((text, index) => (
        <motion.span
          key={index}
          className={`${index === currentIndex ? 'relative' : 'absolute inset-0'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: index === currentIndex ? 1 : 0,
            y: index === currentIndex ? 0 : -20,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {text}
        </motion.span>
      ))}
    </div>
  );
}

// ==================== HOVER CARD ====================

export interface HoverCardProps {
  children: ReactNode;
  className?: string;
  rotateAmount?: number;
}

export function HoverCard({ children, className = '', rotateAmount = 5 }: HoverCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);
    setRotation({
      x: -percentY * rotateAmount,
      y: percentX * rotateAmount,
    });
  }, [rotateAmount]);

  const handleMouseLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: rotation.x,
        rotateY: rotation.y,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}

// ==================== COUNTER ANIMATION ====================

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 1,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const springValue = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });
  const display = useTransform(springValue, (v) => 
    `${prefix}${v.toFixed(decimals)}${suffix}`
  );

  React.useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span className={className}>{display}</motion.span>;
}

// ==================== LIQUID BUTTON ====================

export interface LiquidButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  color?: string;
}

export function LiquidButton({ 
  children, 
  onClick, 
  className = '',
  color = 'rgb(59, 130, 246)',
}: LiquidButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
    >
      {/* Liquid blob effect */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: isHovered ? 1.5 : 0,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          background: color,
          borderRadius: '50%',
          transformOrigin: 'center',
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

// ==================== FLIP CARD ====================

export interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  className?: string;
  flipOnHover?: boolean;
  flipOnClick?: boolean;
}

export function FlipCard({ 
  front, 
  back, 
  className = '',
  flipOnHover = true,
  flipOnClick = false,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    if (flipOnClick) setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className={`relative ${className}`}
      style={{ perspective: 1000 }}
      onMouseEnter={() => flipOnHover && setIsFlipped(true)}
      onMouseLeave={() => flipOnHover && setIsFlipped(false)}
      onClick={handleClick}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {front}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

// ==================== TYPEWRITER EFFECT ====================

export interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursor?: boolean;
}

export function Typewriter({ 
  text, 
  speed = 50, 
  delay = 0,
  className = '',
  cursor = true,
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;
    let charIndex = 0;

    const startTyping = () => {
      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        charIndex++;
        timeout = setTimeout(startTyping, speed);
      }
    };

    timeout = setTimeout(startTyping, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  // Cursor blink
  React.useEffect(() => {
    if (!cursor) return;
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [cursor]);

  return (
    <span className={className}>
      {displayedText}
      {cursor && (
        <motion.span
          animate={{ opacity: showCursor ? 1 : 0 }}
          className="inline-block w-0.5 h-[1.2em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

export default Magnetic;
