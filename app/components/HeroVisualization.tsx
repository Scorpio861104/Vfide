'use client';

import { motion } from 'framer-motion';

import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export function HeroVisualization() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="relative w-full h-75 sm:h-100 md:h-125 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute w-60 h-60 sm:w-80 sm:h-80 md:w-100 md:h-100"
        >
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-pulse" />
          <div className="absolute inset-4 rounded-full border border-cyan-400/15" />
          <div className="absolute inset-8 rounded-full border border-cyan-400/10" />
        </motion.div>
        
        {/* Central shield */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: -20 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10"
          style={{ perspective: '1000px' }}
        >
          <svg 
            width="140" 
            height="170"
            className="sm:w-45 sm:h-55"
            viewBox="0 0 100 120" 
            style={{ width: '140px', height: '170px' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="hero-shield-gradient" x1="50" y1="0" x2="50" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#0a0a15" />
              </linearGradient>
              <linearGradient id="hero-accent-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#0080FF" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Shield body */}
            <path 
              d="M50 5 L90 20 V55 C90 85 70 105 50 115 C30 105 10 85 10 55 V20 L50 5Z" 
              fill="url(#hero-shield-gradient)" 
              stroke="url(#hero-accent-gradient)" 
              strokeWidth="1.5"
            />
            
            {/* V letterform */}
            <path 
              d="M30 35 L50 85 L70 35" 
              fill="none" 
              stroke="#F8F8FC" 
              strokeWidth="6" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              filter="url(#glow)"
            />
            
            {/* Accent details */}
            <circle cx="50" cy="98" r="3" fill="#00F0FF" filter="url(#glow)" />
            <path d="M35 25 L65 25" stroke="#00F0FF" strokeWidth="1" opacity="0.6" />
          </svg>
        </motion.div>
        
        {/* Orbiting elements */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { rotate: 360 }}
          transition={prefersReducedMotion ? undefined : { duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute w-72 h-72 md:w-96 md:h-96"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.8)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(0,255,136,0.8)]" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_15px_rgba(167,139,250,0.8)]" />
        </motion.div>
      </div>
    </div>
  );
}
