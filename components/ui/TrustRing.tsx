/**
 * Trust Ring Animation Component
 * Animated circular "proof rings" that appear on interactions
 * Visual representation of trust levels and verification
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface TrustRingProps {
  /** Trust score 0-100 */
  score: number;
  /** Size in pixels */
  size?: number;
  /** Show animated pulse */
  animated?: boolean;
  /** Show score label */
  showLabel?: boolean;
  /** Ring thickness */
  thickness?: number;
  /** Custom class */
  className?: string;
}

/**
 * Get color based on trust score
 */
function getTrustColor(score: number): { primary: string; secondary: string; glow: string } {
  if (score >= 80) {
    return {
      primary: "#00FF88",
      secondary: "#00FFB2",
      glow: "rgba(0, 255, 136, 0.4)"
    };
  } else if (score >= 60) {
    return {
      primary: "#00FFB2",
      secondary: "#00D4FF",
      glow: "rgba(0, 255, 178, 0.4)"
    };
  } else if (score >= 40) {
    return {
      primary: "#00D4FF",
      secondary: "#7B61FF",
      glow: "rgba(0, 212, 255, 0.4)"
    };
  } else if (score >= 20) {
    return {
      primary: "#FFD700",
      secondary: "#FFA500",
      glow: "rgba(255, 215, 0, 0.4)"
    };
  } else {
    return {
      primary: "#EF4444",
      secondary: "#DC2626",
      glow: "rgba(239, 68, 68, 0.4)"
    };
  }
}

/**
 * Get trust level label
 */
function getTrustLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Low";
  return "New";
}

export function TrustRing({
  score,
  size = 120,
  animated = true,
  showLabel = true,
  thickness = 8,
  className = ""
}: TrustRingProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const colors = getTrustColor(score);
  const label = getTrustLabel(score);
  
  // Animated score counter
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score, animated]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow effect */}
      {animated && (
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`trust-gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <filter id="trust-ring-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={thickness}
        />

        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#trust-gradient-${score})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#trust-ring-glow)"
          initial={animated ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (tick / 100) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const innerR = radius - thickness / 2 - 4;
          const outerR = radius + thickness / 2 + 4;
          
          return (
            <line
              key={tick}
              x1={size / 2 + innerR * Math.cos(rad)}
              y1={size / 2 + innerR * Math.sin(rad)}
              x2={size / 2 + outerR * Math.cos(rad)}
              y2={size / 2 + outerR * Math.sin(rad)}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold"
          style={{ color: colors.primary }}
          initial={animated ? { scale: 0.5, opacity: 0 } : undefined}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {displayScore}
        </motion.span>
        
        {showLabel && (
          <motion.span
            className="text-xs text-zinc-400 uppercase tracking-wider"
            initial={animated ? { opacity: 0 } : undefined}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            {label}
          </motion.span>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive Trust Rings - Multiple concentric rings
 * Used for showing multi-dimensional trust scores
 */
interface TrustRingsProps {
  scores: {
    label: string;
    value: number;
    color?: "green" | "blue" | "purple" | "gold";
  }[];
  size?: number;
  className?: string;
}

export function TrustRings({
  scores,
  size = 200,
  className = ""
}: TrustRingsProps) {
  const colorMap = {
    green: { primary: "#00FF88", secondary: "#00FFB2" },
    blue: { primary: "#00D4FF", secondary: "#00D4FF" },
    purple: { primary: "#7B61FF", secondary: "#7B61FF" },
    gold: { primary: "#FFD700", secondary: "#FFA500" }
  };

  const ringThickness = 6;
  const ringGap = 12;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          {scores.map((score, i) => (
            <linearGradient key={i} id={`ring-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorMap[score.color || "blue"].primary} />
              <stop offset="100%" stopColor={colorMap[score.color || "blue"].secondary} />
            </linearGradient>
          ))}
        </defs>

        {scores.map((score, i) => {
          const radius = (size / 2) - ringThickness - (i * (ringThickness + ringGap));
          const circumference = 2 * Math.PI * radius;
          const progress = (score.value / 100) * circumference;
          const offset = circumference - progress;

          return (
            <g key={i}>
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={ringThickness}
              />

              {/* Progress ring */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`url(#ring-gradient-${i})`}
                strokeWidth={ringThickness}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
              />
            </g>
          );
        })}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-zinc-100">
          {Math.round(scores.reduce((a, b) => a + b.value, 0) / scores.length)}
        </span>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">
          Overall
        </span>
      </div>
    </div>
  );
}

/**
 * Ripple Trust Effect - Expanding rings on interaction
 */
export function TrustRipple({
  trigger,
  color = "#00FFB2",
  className = ""
}: {
  trigger: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {trigger && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`absolute inset-0 rounded-full border-2 ${className}`}
              style={{ borderColor: color }}
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  );
}

export default TrustRing;
