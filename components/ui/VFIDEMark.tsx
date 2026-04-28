/**
 * VFIDE Mark Component
 * Renders the canonical VFIDE mark asset with optional glow and intro animation.
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
  const height = Math.round(size * 1.1);

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

      <motion.img
        src="/branding/vfide-mark-primary.svg"
        alt="VFIDE logo"
        width={size}
        height={height}
        className="relative z-10 select-none"
        initial={animated ? { opacity: 0, y: 6, scale: 0.92 } : undefined}
        animate={animated ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
    </motion.div>
  );
}

export default VFIDEMark;
