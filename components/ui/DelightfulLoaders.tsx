/**
 * Delightful Loading States
 * Loading animations with personality, not just spinners
 */

'use client';

import { motion } from "framer-motion";

/**
 * VFIDE Shield Loader
 * Animated shield that pulses while loading
 */
export function ShieldLoader({ 
  size = 60,
  text = "Loading...",
  className = "" 
}: { 
  size?: number;
  text?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <motion.svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 100 120"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <defs>
          <linearGradient id="shield-loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFB2">
              <animate
                attributeName="stop-color"
                values="#00FFB2; #00D4FF; #7B61FF; #00FFB2"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#7B61FF">
              <animate
                attributeName="stop-color"
                values="#7B61FF; #00FFB2; #00D4FF; #7B61FF"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>
        
        <path
          d="M50 5 L90 25 V75 C90 95 70 110 50 115 C30 110 10 95 10 75 V25 L50 5Z"
          fill="rgba(15, 15, 20, 0.8)"
          stroke="url(#shield-loader-gradient)"
          strokeWidth="3"
        />
        
        {/* Animated scan line */}
        <motion.rect
          x="15"
          width="70"
          height="4"
          fill="url(#shield-loader-gradient)"
          opacity="0.6"
          rx="2"
          animate={{
            y: [20, 100, 20],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.svg>
      
      {text && (
        <motion.span
          className="text-zinc-400 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

/**
 * Hexagon Spinner
 * Rotating hexagon with trail effect
 */
export function HexagonSpinner({ 
  size = 48,
  className = "" 
}: { 
  size?: number;
  className?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      className={className}
      animate={{ rotate: 360 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <defs>
        <linearGradient id="hex-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFB2" />
          <stop offset="50%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
      
      <polygon
        points="25,5 45,15 45,35 25,45 5,35 5,15"
        fill="none"
        stroke="url(#hex-spinner-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="100"
        strokeDashoffset="25"
      />
    </motion.svg>
  );
}

/**
 * Pulse Dots Loader
 * Three dots that pulse in sequence
 */
export function PulseDotsLoader({ 
  color = "#00FFB2",
  size = 8,
  className = "" 
}: { 
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: "50%"
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

/**
 * Trust Ring Loader
 * Concentric rings that expand and contract
 */
export function TrustRingLoader({ 
  size = 60,
  className = "" 
}: { 
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: i === 0 ? "#00FFB2" : i === 1 ? "#00D4FF" : "#7B61FF",
          }}
          animate={{
            scale: [0.5, 1],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}

/**
 * Blockchain Loading Animation
 * Animated blocks connecting to represent blockchain activity
 */
export function BlockchainLoader({ 
  size = 80,
  text = "Processing transaction...",
  className = "" 
}: { 
  size?: number;
  text?: string;
  className?: string;
}) {
  const blockSize = size / 4;
  
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <motion.div
              style={{
                width: blockSize,
                height: blockSize,
                background: "linear-gradient(135deg, #00FFB2 0%, #00D4FF 100%)",
                borderRadius: 4,
              }}
              animate={{
                scale: [0.8, 1, 0.8],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
            {i < 3 && (
              <motion.div
                style={{
                  width: blockSize / 2,
                  height: 2,
                  background: "#00FFB2",
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scaleX: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.15 + 0.1,
                }}
              />
            )}
          </div>
        ))}
      </div>
      
      {text && (
        <motion.span
          className="text-zinc-400 text-sm text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

/**
 * Success Checkmark Animation
 * Animated checkmark that draws itself
 */
export function SuccessCheckmark({ 
  size = 60,
  color = "#00FF88",
  className = "" 
}: { 
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      className={className}
    >
      {/* Background circle */}
      <motion.circle
        cx="25"
        cy="25"
        r="23"
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      
      {/* Filled background */}
      <motion.circle
        cx="25"
        cy="25"
        r="20"
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
      
      {/* Checkmark */}
      <motion.path
        d="M15 25 L22 32 L35 18"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

/**
 * Typing Indicator
 * Shows someone is typing/thinking
 */
export function TypingIndicator({ 
  color = "#00FFB2",
  className = "" 
}: { 
  color?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-full ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 6,
            height: 6,
            backgroundColor: color,
            borderRadius: "50%"
          }}
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

export default ShieldLoader;
