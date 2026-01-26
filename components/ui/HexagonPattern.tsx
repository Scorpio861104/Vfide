/**
 * Hexagonal Pattern Component
 * A distinctive VFIDE visual motif representing trust & stability
 * Hexagons = honeycomb structure = strength & interconnection
 */

"use client";

import { motion } from "framer-motion";

interface HexagonPatternProps {
  className?: string;
  opacity?: number;
  animated?: boolean;
  density?: "sparse" | "normal" | "dense";
  color?: "accent" | "purple" | "gold" | "trust";
}

export function HexagonPattern({
  className = "",
  opacity = 0.05,
  animated = true,
  density = "normal",
  color = "accent"
}: HexagonPatternProps) {
  const densityMap = {
    sparse: 80,
    normal: 50,
    dense: 30
  };
  
  const colorMap = {
    accent: "rgba(0, 255, 178, VAR)",
    purple: "rgba(123, 97, 255, VAR)",
    gold: "rgba(255, 215, 0, VAR)",
    trust: "rgba(0, 255, 136, VAR)"
  };
  
  const size = densityMap[density];
  const hexColor = colorMap[color].replace("VAR", String(opacity));
  const _hexColorHover = colorMap[color].replace("VAR", String(opacity * 2));

  // SVG hexagon pattern
  const patternSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 1.732}">
      <defs>
        <pattern id="hex" width="${size * 1.5}" height="${size * 1.732}" patternUnits="userSpaceOnUse">
          <polygon 
            points="${size * 0.5},0 ${size * 1.5},0 ${size * 2},${size * 0.866} ${size * 1.5},${size * 1.732} ${size * 0.5},${size * 1.732} 0,${size * 0.866}" 
            fill="none" 
            stroke="${hexColor}" 
            stroke-width="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>
  `.replace(/\s+/g, ' ');

  const encodedSvg = encodeURIComponent(patternSvg);

  return (
    <motion.div
      className={`absolute inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
        backgroundRepeat: "repeat",
      }}
    >
      {animated && (
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
            backgroundRepeat: "repeat",
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * Floating Hexagon - Individual animated hexagon for decorative use
 */
export function FloatingHexagon({
  size = 60,
  color = "accent",
  delay = 0,
  className = ""
}: {
  size?: number;
  color?: "accent" | "purple" | "gold" | "trust";
  delay?: number;
  className?: string;
}) {
  const colorMap = {
    accent: "#00FFB2",
    purple: "#7B61FF",
    gold: "#FFD700",
    trust: "#00FF88"
  };
  
  const fillColor = colorMap[color];
  
  return (
    <motion.svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      className={`absolute ${className}`}
      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
      animate={{ 
        opacity: [0, 0.15, 0.1, 0.15, 0],
        scale: [0.5, 1, 1.1, 1, 0.5],
        rotate: [-30, 0, 10, 0, 30],
        y: [0, -50, -100, -150, -200]
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <polygon
        points="50,5 95,30 95,80 50,105 5,80 5,30"
        fill="none"
        stroke={fillColor}
        strokeWidth="2"
        opacity="0.6"
      />
      <polygon
        points="50,20 80,37 80,70 50,87 20,70 20,37"
        fill={fillColor}
        opacity="0.1"
      />
    </motion.svg>
  );
}

/**
 * Hexagon Shield - VFIDE's signature element
 * Combines hexagon + shield for brand identity
 */
export function HexagonShield({
  size = 100,
  glowing = true,
  animated = true,
  className = ""
}: {
  size?: number;
  glowing?: boolean;
  animated?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.5 }}
    >
      {glowing && (
        <motion.div
          className="absolute inset-0 blur-2xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: "radial-gradient(circle, rgba(0, 255, 178, 0.4) 0%, transparent 70%)",
          }}
        />
      )}
      
      <svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 100 120"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="hex-shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFB2" />
            <stop offset="50%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#7B61FF" />
          </linearGradient>
          <linearGradient id="hex-shield-fill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0a0a15" />
          </linearGradient>
          <filter id="hex-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer hexagon shield */}
        <motion.path
          d="M50 5 L90 25 V75 C90 95 70 110 50 115 C30 110 10 95 10 75 V25 L50 5Z"
          fill="url(#hex-shield-fill)"
          stroke="url(#hex-shield-gradient)"
          strokeWidth="2"
          filter="url(#hex-glow)"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Inner hexagon */}
        <motion.polygon
          points="50,25 75,40 75,70 50,85 25,70 25,40"
          fill="none"
          stroke="url(#hex-shield-gradient)"
          strokeWidth="1"
          opacity="0.5"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 0.5 } : undefined}
          transition={{ delay: 0.5, duration: 0.5 }}
        />
        
        {/* Center check/trust mark */}
        <motion.path
          d="M35 55 L45 65 L65 45"
          fill="none"
          stroke="#00FFB2"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ delay: 1, duration: 0.5, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

export default HexagonPattern;
