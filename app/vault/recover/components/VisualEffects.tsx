'use client';
import { GlassCard } from "@/components/ui/GlassCard";

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Lock } from 'lucide-react';

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Primary aurora */}
      <motion.div 
        animate={{ 
          x: [0, 100, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/4 w-200 h-200 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-[150px]"
      />
      
      {/* Secondary aurora */}
      <motion.div 
        animate={{ 
          x: [0, -80, 60, 0],
          y: [0, 60, -40, 0],
          scale: [1, 0.8, 1.1, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 right-1/4 w-175 h-175 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-[130px]"
      />
      
      {/* Accent glow */}
      <motion.div 
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-[100px]"
      />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════

interface Particle {
  id: number;
  x: number;
  duration: number;
  delay: number;
}

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParticles([...Array(15)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        duration: Math.random() * 15 + 15,
        delay: Math.random() * 10
      })));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            x: `${p.x}%`,
            y: '110%',
            opacity: 0
          }}
          animate={{ 
            y: '-10%',
            opacity: [0, 0.6, 0]
          }}
          transition={{ 
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D VAULT KEY VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function VaultKeyVisualization({ isSearching }: { isSearching: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-200, 200], [15, -15]);
  const rotateY = useTransform(mouseX, [-200, 200], [-15, 15]);
  
  const springRotateX = useSpring(rotateX, { stiffness: 100, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 100, damping: 30 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  
  return (
    <motion.div 
      className="relative w-48 h-48 md:w-64 md:h-64 mx-auto"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
    >
      <motion.div
        style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: "preserve-3d" }}
        className="relative w-full h-full"
      >
        {/* Outer ring */}
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-dashed"
        />
        
        {/* Middle ring */}
        <motion.div
          animate={isSearching ? { rotate: -360 } : { rotate: 0 }}
          transition={{ duration: 5, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          className="absolute inset-4 md:inset-6 rounded-full border-2 border-purple-500/30"
        />
        
        {/* Inner ring */}
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 2, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          className="absolute inset-8 md:inset-12 rounded-full border-2 border-emerald-500/30"
        />
        
        {/* Central key */}
        <motion.div
          animate={isSearching ? { 
            scale: [1, 1.1, 1],
          } : { scale: 1 }}
          transition={{ duration: 1, repeat: isSearching ? Infinity : 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            animate={{ 
              boxShadow: isSearching 
                ? ['0 0 30px rgba(6, 182, 212, 0.3)', '0 0 60px rgba(6, 182, 212, 0.6)', '0 0 30px rgba(6, 182, 212, 0.3)']
                : '0 0 40px rgba(6, 182, 212, 0.3)'
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 backdrop-blur-xl flex items-center justify-center border border-cyan-500/50"
          >
            <KeyRound className="h-8 w-8 md:h-10 md:w-10 text-cyan-400" />
          </motion.div>
          
          {/* Scan line */}
          {isSearching && (
            <motion.div
              animate={{ y: [-40, 40] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            />
          )}
        </motion.div>
        
        {/* Radar pulses */}
        {isSearching && [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6
            }}
            className="absolute inset-0 rounded-full border border-cyan-400/50"
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM GLASS CARD
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED SEARCH METHOD BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export function SearchMethodButton({ 
