"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for list items
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className = "", delay = 0 }: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: delay,
            staggerChildren: 0.1
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger item
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Pulse dot
interface PulseDotProps {
  color?: string;
  size?: "sm" | "md" | "lg";
}

export function PulseDot({ color = "#00F0FF", size = "md" }: PulseDotProps) {
  const sizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3"
  };
  
  return (
    <span className="relative inline-flex">
      <span 
        className={`${sizes[size]} rounded-full`}
        style={{ background: color }}
      />
      <motion.span
        className={`absolute inset-0 ${sizes[size]} rounded-full`}
        style={{ background: color }}
        animate={{ 
          scale: [1, 2, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </span>
  );
}

// Shimmer skeleton
interface ShimmerProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Shimmer({ className = "h-4 w-24", rounded = "md" }: ShimmerProps) {
  const roundedClasses = {
    sm: "rounded",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full"
  };
  
  return (
    <div className={`relative overflow-hidden bg-[#1F1F2A] ${roundedClasses[rounded]} ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2A2A35] to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}

// Success checkmark animation
interface SuccessCheckProps {
  show: boolean;
  onComplete?: () => void;
}

export function SuccessCheck({ show, onComplete }: SuccessCheckProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onAnimationComplete={onComplete}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-lg shadow-[#22C55E]/30"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-8 h-8 text-white"
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
      )}
    </AnimatePresence>
  );
}

// Confetti explosion
interface ConfettiProps {
  trigger: boolean;
  colors?: string[];
}

export function Confetti({ trigger, colors = ["#00F0FF", "#00FF88", "#FFD700", "#A78BFA"] }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    scale: number;
  }>>([]);
  
  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * -100 - 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Confetti particles must be generated immediately on trigger
      setParticles(newParticles);
      
      const timeout = setTimeout(() => setParticles([]), 2000);
      return () => clearTimeout(timeout);
    }
  }, [trigger, colors]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: "50vw", 
              y: "50vh", 
              scale: 0, 
              rotate: 0 
            }}
            animate={{ 
              x: `calc(50vw + ${particle.x}vw)`,
              y: `calc(50vh + ${particle.y}vh)`,
              scale: particle.scale,
              rotate: particle.rotation
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              duration: 1.5,
              ease: "easeOut"
            }}
            className="absolute w-3 h-3"
            style={{ background: particle.color, borderRadius: "2px" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Number counter animation
interface CounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function Counter({ value, duration = 1500, prefix = "", suffix = "", className = "" }: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (value - startValue) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Animation should only restart when value or duration changes
  }, [value, duration]);
  
  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

// Hover card effect
interface HoverCardEffectProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverCardEffect({ children, className = "" }: HoverCardEffectProps) {
  return (
    <motion.div
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Magnetic button effect
interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function Magnetic({ children, className = "", strength = 0.3 }: MagneticProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setPosition({ x, y });
  };
  
  const reset = () => setPosition({ x: 0, y: 0 });
  
  return (
    <motion.div
      animate={position}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Glow on hover
interface GlowHoverProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function GlowHover({ children, color = "#00F0FF", className = "" }: GlowHoverProps) {
  return (
    <motion.div
      whileHover={{
        boxShadow: `0 0 40px -10px ${color}`
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
