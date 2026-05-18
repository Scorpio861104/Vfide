/**
 * Easter Eggs & Delightful Interactions
 * Hidden surprises that make VFIDE memorable
 */

'use client';

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

/**
 * Konami Code Hook
 * Detects the famous ↑↑↓↓←→←→BA sequence
 */
export function useKonamiCode(callback: () => void) {
  const [input, setInput] = useState<string[]>([]);
  const konamiCode = [
    "ArrowUp", "ArrowUp",
    "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight",
    "ArrowLeft", "ArrowRight",
    "KeyB", "KeyA"
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newInput = [...input, e.code].slice(-10);
      setInput(newInput);

      if (newInput.join(",") === konamiCode.join(",")) {
        callback();
        setInput([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, callback]);
}

/**
 * Confetti Celebration
 * Fires confetti for achievements and milestones
 */
export function fireConfetti(options?: {
  colors?: string[];
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
}) {
  const defaults = {
    colors: ["#00FFB2", "#00D4FF", "#7B61FF", "#FFD700", "#FF6B6B"],
    particleCount: 100,
    spread: 70,
    origin: { x: 0.5, y: 0.6 }
  };

  const settings = { ...defaults, ...options };

  confetti({
    particleCount: settings.particleCount,
    spread: settings.spread,
    origin: settings.origin,
    colors: settings.colors,
    disableForReducedMotion: true,
  });
}

/**
 * VFIDE-themed confetti burst
 */
export function fireVFIDEConfetti() {
  // Left burst
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0 },
    colors: ["#00FFB2", "#00D4FF", "#7B61FF"]
  });

  // Right burst
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1 },
    colors: ["#00FFB2", "#00D4FF", "#7B61FF"]
  });
}

/**
 * Star shower for major achievements
 */
export function fireStarShower() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => 
    Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#00FFB2", "#7B61FF"],
      shapes: ["star"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#00D4FF", "#FFD700"],
      shapes: ["star"],
    });
  }, 250);
}

/**
 * Secret Mode Overlay
 * Fun overlay that appears when Konami code is entered
 */
export function SecretModeOverlay({ 
  isActive, 
  onClose 
}: { 
  isActive: boolean; 
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="text-center p-8"
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, rotate: 10 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Secret VFIDE logo */}
            <motion.div
              className="text-8xl mb-6"
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              🛡️✨
            </motion.div>
            
            <motion.h1
              className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#00FFB2] via-[#00D4FF] to-[#7B61FF] bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0%", "100%", "0%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              You found the secret! 🎉
            </motion.h1>
            
            <p className="text-zinc-400 text-lg mb-6">
              You&apos;re a true VFIDE power user.
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <motion.div
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#00FFB2] to-[#00D4FF] text-zinc-950 font-semibold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                +100 Secret Points 🏆
              </motion.div>
              <motion.div
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7B61FF] to-[#7B61FF] text-white font-semibold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Easter Egg #1 Found 🥚
              </motion.div>
            </div>
            
            <p className="text-zinc-500 text-sm mt-8">
              Click anywhere to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Easter Eggs Provider
 * Wraps the app to enable all Easter eggs
 */
export function EasterEggsProvider({ children }: { children: React.ReactNode }) {
  const [secretMode, setSecretMode] = useState(false);

  // Konami code activates secret mode
  useKonamiCode(() => {
    setSecretMode(true);
    fireStarShower();
  });

  return (
    <>
      {children}
      <SecretModeOverlay 
        isActive={secretMode} 
        onClose={() => setSecretMode(false)} 
      />
    </>
  );
}

/**
 * First Transaction Celebration
 * Shows special animation on first successful transaction
 */
export function useFirstTransactionCelebration() {
  const [hasCelebrated, setHasCelebrated] = useState(false);

  useEffect(() => {
    const celebrated = localStorage.getItem("vfide_first_tx_celebrated");
    if (celebrated) {
      setHasCelebrated(true);
    }
  }, []);

  const celebrate = useCallback(() => {
    if (hasCelebrated) return;

    fireVFIDEConfetti();
    localStorage.setItem("vfide_first_tx_celebrated", "true");
    setHasCelebrated(true);

    // Play success sound if available
    try {
      const audio = new Audio("/sounds/success-celebration.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore if autoplay blocked
    } catch {}
  }, [hasCelebrated]);

  return { celebrate, hasCelebrated };
}

/**
 * Milestone celebration hook
 */
export function useMilestoneCelebration() {
  const celebrate = useCallback((type: "small" | "medium" | "large") => {
    switch (type) {
      case "small":
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ["#00FFB2", "#00D4FF"]
        });
        break;
      case "medium":
        fireVFIDEConfetti();
        break;
      case "large":
        fireStarShower();
        break;
    }
  }, []);

  return { celebrate };
}

/**
 * Hover Sparkle Effect
 * Adds sparkles when hovering over special elements
 */
export function SparkleOnHover({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (Math.random() > 0.7) { // Only 30% chance per move
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newSparkle = { id: Date.now(), x, y };
      setSparkles(prev => [...prev.slice(-10), newSparkle]);
      
      // Remove after animation
      setTimeout(() => {
        setSparkles(prev => prev.filter(s => s.id !== newSparkle.id));
      }, 1000);
    }
  };

  return (
    <div 
      className={`relative ${className}`} 
      onMouseMove={handleMouseMove}
    >
      {children}
      
      <AnimatePresence>
        {sparkles.map(sparkle => (
          <motion.div
            key={sparkle.id}
            className="absolute pointer-events-none text-lg"
            style={{ left: sparkle.x, top: sparkle.y }}
            initial={{ opacity: 1, scale: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            ✨
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default EasterEggsProvider;
