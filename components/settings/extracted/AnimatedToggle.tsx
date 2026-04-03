'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function AnimatedToggle({ checked, onChange, disabled, ariaLabel }: AnimatedToggleProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked 
          ? 'bg-gradient-to-r from-yellow-500 to-amber-500' 
          : 'bg-zinc-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
        initial={false}
        animate={{ 
          left: checked ? 28 : 4,
          scale: checked ? 1.1 : 1 
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      {checked && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute left-1.5 top-1.5 text-white"
        >
          <Check className="w-3 h-3" />
        </motion.div>
      )}
    </motion.button>
  );
}
