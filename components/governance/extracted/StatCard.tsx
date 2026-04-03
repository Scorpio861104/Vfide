'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function StatCard({ label, value, icon, index = 0 }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Parse numeric value for animation
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.]/g, '')) 
    : value;
  const suffix = typeof value === 'string' 
    ? (value.includes('%') ? '%' : value.includes('M') ? 'M' : '') 
    : '';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Animated background pattern */}
      <motion.div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
        animate={{
          backgroundPosition: isHovered ? '8px 8px' : '0px 0px',
        }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium mb-1 md:mb-2">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' || !isNaN(numericValue) ? (
              <AnimatedNumber value={numericValue} suffix={suffix} />
            ) : (
              value
            )}
          </p>
        </div>
        <motion.span 
          className="text-2xl md:text-3xl"
          animate={{ 
            scale: isHovered ? 1.2 : 1,
            rotate: isHovered ? 10 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {icon}
        </motion.span>
      </div>
      
      {/* Shimmer effect on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'linear' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
