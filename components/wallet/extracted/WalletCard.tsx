'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function WalletCard({ wallet, onActivate, onDisconnect, onEdit }: WalletCardProps) {
  const statusColor = getStatusColor(wallet.connected, wallet.isActive);
  const chain = getChainById(wallet.chainId);

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border-2 ${
        wallet.isActive
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 shadow-sm'
      }`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, borderColor: wallet.isActive ? undefined : 'rgba(59, 130, 246, 0.5)' }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <motion.span 
            className="text-3xl md:text-4xl shrink-0"
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.3 }}
          >
            {wallet.icon}
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">
                {wallet.nickname}
              </h3>
              <motion.div 
                className={`w-2 h-2 rounded-full ${statusColor} shrink-0`}
                animate={wallet.isActive ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            <p className="font-mono text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {wallet.address}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {wallet.type} • {chain?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <motion.div 
        className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Balance</p>
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {wallet.balance} {chain?.symbol}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <AnimatedBalance value={wallet.balanceUSD} prefix="$" />
        </p>
      </motion.div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!wallet.isActive && wallet.connected && (
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => onActivate(wallet.id)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Set Active
            </MobileButton>
          </motion.div>
        )}
        {wallet.isActive && (
          <motion.span 
            className="flex-1 text-center bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
            animate={{ boxShadow: ['0 0 0px rgba(34, 197, 94, 0)', '0 0 10px rgba(34, 197, 94, 0.3)', '0 0 0px rgba(34, 197, 94, 0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Active
          </motion.span>
        )}
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MobileButton
            onClick={() => onEdit(wallet.id)}
            className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </MobileButton>
        </motion.div>
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MobileButton
            onClick={() => onDisconnect(wallet.id)}
            className="w-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Power className="w-4 h-4" />
            Disconnect
          </MobileButton>
        </motion.div>
      </div>

      {/* Last Used */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
        Last used {(() => Math.floor((Date.now() - wallet.lastUsed) / (60 * 1000)))()} minutes ago
      </p>
    </motion.div>
  );
}
