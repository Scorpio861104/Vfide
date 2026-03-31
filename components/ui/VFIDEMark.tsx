/**
 * VFIDE Mark Component
 * New signature brand element representing decentralized trust & architecture
 * Combines geometric precision with luminous gradient accents
 */

'use client';

import { motion } from "framer-motion";

interface VFIDEMarkProps {
  size?: number;
  glowing?: boolean;
  animated?: boolean;
  className?: string;
}

export function VFIDEMark({
  size = 100,
  glowing = true,
  animated = true,
  className = ""
}: VFIDEMarkProps) {
  const scale = size / 400; // Base SVG is 400x440

  return (
    <motion.div
      className={`relative ${className}`}
      initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.5 }}
    >
      {glowing && (
        <motion.div
          className="absolute inset-0 blur-2xl rounded-full"
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: "radial-gradient(circle, rgba(0, 232, 240, 0.4) 0%, transparent 70%)",
          }}
        />
      )}

      <svg
        width={size}
        height={size * 1.1}
        viewBox="0 0 400 440"
        className="relative z-10"
      >
        <defs>
          {/* Left arm: darker face */}
          <linearGradient id="armL" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="#1c3040" />
            <stop offset="40%" stopColor="#142430" />
            <stop offset="100%" stopColor="#0a1218" />
          </linearGradient>

          {/* Right arm: lighter face */}
          <linearGradient id="armR" x1="1" y1="0" x2="0.65" y2="1">
            <stop offset="0%" stopColor="#243848" />
            <stop offset="40%" stopColor="#1a2c38" />
            <stop offset="100%" stopColor="#0e1a22" />
          </linearGradient>

          {/* F top bar: luminous fade */}
          <linearGradient id="barTop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00e8f0" stopOpacity="0" />
            <stop offset="15%" stopColor="#00e8f0" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#00e8f0" />
            <stop offset="85%" stopColor="#00e8f0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00e8f0" stopOpacity="0" />
          </linearGradient>

          {/* F crossbar: dimmer */}
          <linearGradient id="barMid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00e8f0" stopOpacity="0" />
            <stop offset="20%" stopColor="#00e8f0" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#00e8f0" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#00e8f0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00e8f0" stopOpacity="0" />
          </linearGradient>

          {/* Vertex light rise */}
          <linearGradient id="rise" x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor="#00e8f0" />
            <stop offset="40%" stopColor="#00c0d0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00e8f0" stopOpacity="0" />
          </linearGradient>

          {/* Inner shadow strokes */}
          <linearGradient id="innerL" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#14242e" />
            <stop offset="100%" stopColor="#0a1418" />
          </linearGradient>

          <linearGradient id="innerR" x1="0.7" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#1a2e38" />
            <stop offset="100%" stopColor="#0c1820" />
          </linearGradient>

          {/* Edge outline */}
          <linearGradient id="edge" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#00dce6" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#00dce6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00dce6" stopOpacity="0.6" />
          </linearGradient>

          {/* Base glow */}
          <linearGradient id="glow" x1="0.5" y1="1" x2="0.5" y2="0.2">
            <stop offset="0%" stopColor="#00e8f0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00e8f0" stopOpacity="0" />
          </linearGradient>

          {/* Filter for depth */}
          <filter id="vfide-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground glow */}
        <motion.ellipse
          cx="200"
          cy="380"
          rx="80"
          ry="16"
          fill="url(#glow)"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 1 } : undefined}
          transition={{ delay: 0.2, duration: 0.5 }}
        />

        {/* Left arm (V left + bracket) */}
        <motion.path
          d="M52 52 L96 52 L96 68 L82 68 L184 320 L172 320Z"
          fill="url(#armL)"
          initial={animated ? { opacity: 0, x: -20 } : undefined}
          animate={animated ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.3, duration: 0.6 }}
        />

        {/* Right arm (V right + bracket) */}
        <motion.path
          d="M348 52 L304 52 L304 68 L318 68 L216 320 L228 320Z"
          fill="url(#armR)"
          initial={animated ? { opacity: 0, x: 20 } : undefined}
          animate={animated ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.3, duration: 0.6 }}
        />

        {/* Inner depth strokes */}
        <motion.path
          d="M102 100 L190 312"
          stroke="url(#innerL)"
          strokeWidth="14"
          strokeLinecap="butt"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ delay: 0.5, duration: 0.8 }}
        />
        <motion.path
          d="M298 100 L210 312"
          stroke="url(#innerR)"
          strokeWidth="14"
          strokeLinecap="butt"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ delay: 0.5, duration: 0.8 }}
        />

        {/* Bracket fill patches */}
        <motion.path
          d="M96 52 L96 68 L82 68 L88 80"
          fill="url(#innerL)"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 1 } : undefined}
          transition={{ delay: 0.4, duration: 0.5 }}
        />
        <motion.path
          d="M304 52 L304 68 L318 68 L312 80"
          fill="url(#innerR)"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 1 } : undefined}
          transition={{ delay: 0.4, duration: 0.5 }}
        />

        {/* F top bar (capstone) */}
        <motion.rect
          x="96"
          y="52"
          width="208"
          height="16"
          fill="url(#barTop)"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 1 } : undefined}
          transition={{ delay: 0.6, duration: 0.5 }}
        />

        {/* Bracket shadow blocks */}
        <rect x="96" y="52" width="16" height="16" fill="#0c2030" />
        <rect x="288" y="52" width="16" height="16" fill="#0e2232" />

        {/* F crossbar */}
        <motion.rect
          x="116"
          y="130"
          width="168"
          height="10"
          fill="url(#barMid)"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 1 } : undefined}
          transition={{ delay: 0.75, duration: 0.5 }}
        />

        {/* Outer edge */}
        <motion.path
          d="M52 52 L96 52 L96 68 L82 68 L200 354 L318 68 L304 68 L304 52 L348 52"
          fill="none"
          stroke="url(#edge)"
          strokeWidth="1.2"
          strokeLinejoin="miter"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ delay: 0.8, duration: 1 }}
        />

        {/* Corner marks (architectural notation) */}
        <motion.path
          d="M52 52 L52 42 L62 42"
          fill="none"
          stroke="#00dce6"
          strokeWidth="1"
          opacity="0.4"
          strokeLinecap="round"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 0.4 } : undefined}
          transition={{ delay: 1, duration: 0.5 }}
        />
        <motion.path
          d="M348 52 L348 42 L338 42"
          fill="none"
          stroke="#00dce6"
          strokeWidth="1"
          opacity="0.4"
          strokeLinecap="round"
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 0.4 } : undefined}
          transition={{ delay: 1, duration: 0.5 }}
        />

        {/* Tick marks along top */}
        <line x1="96" y1="46" x2="96" y2="52" stroke="#00dce6" strokeWidth="0.6" opacity="0.3" />
        <line x1="304" y1="46" x2="304" y2="52" stroke="#00dce6" strokeWidth="0.6" opacity="0.3" />
        <line x1="140" y1="46" x2="140" y2="52" stroke="#00dce6" strokeWidth="0.4" opacity="0.15" />
        <line x1="200" y1="46" x2="200" y2="52" stroke="#00dce6" strokeWidth="0.4" opacity="0.15" />
        <line x1="260" y1="46" x2="260" y2="52" stroke="#00dce6" strokeWidth="0.4" opacity="0.15" />

        {/* Vertex chevron + light */}
        <motion.path
          d="M184 320 L200 360 L216 320"
          fill="none"
          stroke="url(#rise)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ delay: 1.2, duration: 0.6 }}
        />

        {/* Focal point (3 rings) */}
        <motion.circle
          cx="200"
          cy="362"
          r="5.5"
          fill="#00e8f0"
          initial={animated ? { scale: 0 } : undefined}
          animate={animated ? { scale: 1 } : undefined}
          transition={{ delay: 1.5, duration: 0.4 }}
        />
        <motion.circle
          cx="200"
          cy="362"
          r="10"
          fill="#00e8f0"
          opacity="0.12"
          initial={animated ? { scale: 0 } : undefined}
          animate={animated ? { scale: 1 } : undefined}
          transition={{ delay: 1.45, duration: 0.4 }}
        />
        <motion.circle
          cx="200"
          cy="362"
          r="18"
          fill="#00e8f0"
          opacity="0.04"
          initial={animated ? { scale: 0 } : undefined}
          animate={animated ? { scale: 1 } : undefined}
          transition={{ delay: 1.4, duration: 0.4 }}
        />

        {/* Light axis (ghosted) */}
        <path
          d="M200 354 L200 38"
          stroke="url(#rise)"
          strokeWidth="1"
          opacity="0.08"
        />

        {/* Construction guidelines (ghosted) */}
        <path
          d="M184 320 L92 128 M216 320 L308 128"
          fill="none"
          stroke="#00dce6"
          strokeWidth="0.3"
          opacity="0.08"
          strokeDasharray="2 6"
        />
      </svg>
    </motion.div>
  );
}

export default VFIDEMark;
