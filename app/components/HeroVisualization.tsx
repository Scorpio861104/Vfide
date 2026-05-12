'use client';

import { motion } from 'framer-motion';
import { VFIDEMark } from '@/components/ui';

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
        
        {/* Central logo */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: -20 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10"
          style={{ perspective: '1000px' }}
        >
          <VFIDEMark size={140} glowing={false} animated={false} className="sm:scale-110" />
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
