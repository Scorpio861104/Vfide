'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { KeyRound } from 'lucide-react';

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        animate={{ x: [0, 100, -50, 0], y: [0, -50, 50, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/4 top-0 h-200 w-200 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent blur-[150px]"
      />
      <motion.div
        animate={{ x: [0, -80, 60, 0], y: [0, 60, -40, 0], scale: [1, 0.8, 1.1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-0 right-1/4 h-175 w-175 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent blur-[130px]"
      />
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.3, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-[100px]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
    </div>
  );
}

interface Particle {
  id: number;
  x: number;
  duration: number;
  delay: number;
}

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParticles(
        Array.from({ length: 15 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          duration: Math.random() * 15 + 15,
          delay: Math.random() * 10,
        })),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (particles.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ x: `${particle.x}%`, y: '110%', opacity: 0 }}
          animate={{ y: '-10%', opacity: [0, 0.6, 0] }}
          transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: 'linear' }}
          className="absolute h-1 w-1 rounded-full bg-cyan-400/40"
        />
      ))}
    </div>
  );
}

export function VaultKeyVisualization({ isSearching }: { isSearching: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-200, 200], [15, -15]);
  const rotateY = useTransform(mouseX, [-200, 200], [-15, 15]);
  const springRotateX = useSpring(rotateX, { stiffness: 100, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      className="relative mx-auto h-48 w-48 md:h-64 md:w-64"
      style={{ perspective: 1000 }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - rect.left - rect.width / 2);
        mouseY.set(event.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
    >
      <motion.div style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: 'preserve-3d' }} className="relative h-full w-full">
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: isSearching ? Infinity : 0, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-dashed"
        />
        <motion.div
          animate={isSearching ? { rotate: -360 } : { rotate: 0 }}
          transition={{ duration: 5, repeat: isSearching ? Infinity : 0, ease: 'linear' }}
          className="absolute inset-4 rounded-full border-2 border-purple-500/30 md:inset-6"
        />
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 2, repeat: isSearching ? Infinity : 0, ease: 'linear' }}
          className="absolute inset-8 rounded-full border-2 border-emerald-500/30 md:inset-12"
        />
        <motion.div
          animate={isSearching ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 1, repeat: isSearching ? Infinity : 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            animate={{
              boxShadow: isSearching
                ? [
                    '0 0 30px rgba(6, 182, 212, 0.3)',
                    '0 0 60px rgba(6, 182, 212, 0.6)',
                    '0 0 30px rgba(6, 182, 212, 0.3)',
                  ]
                : '0 0 40px rgba(6, 182, 212, 0.3)',
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/50 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 backdrop-blur-xl md:h-20 md:w-20"
          >
            <KeyRound className="h-8 w-8 text-cyan-400 md:h-10 md:w-10" />
          </motion.div>
          {isSearching && (
            <motion.div
              animate={{ y: [-40, 40] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            />
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

