'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ChainSelector({ chains, selectedChain, onSelectChain }: ChainSelectorProps) {
  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Link2 className="w-5 h-5" />
        Select Network
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chains.map((chain, index) => (
          <motion.button
            key={chain.id}
            onClick={() => onSelectChain(chain.id)}
            className={`p-3 md:p-4 rounded-lg border-2 text-left ${
              selectedChain === chain.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03, borderColor: 'rgb(59, 130, 246)' }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-2xl md:text-3xl"
                animate={selectedChain === chain.id ? { rotate: [0, 360] } : {}}
                transition={{ duration: 0.5 }}
              >
                {chain.icon}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate">
                  {chain.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{chain.symbol}</p>
              </div>
              {selectedChain === chain.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
