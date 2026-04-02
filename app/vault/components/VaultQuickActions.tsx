// @ts-nocheck
'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import { Zap, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';

interface VaultQuickActionsProps {
  cardBoundMode: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onTransfer: () => void;
}

export function VaultQuickActions({ cardBoundMode, onDeposit, onWithdraw, onTransfer }: VaultQuickActionsProps) {
  const { showToast } = useToast();

  const handleDeposit = () => {
    if (cardBoundMode) {
      showToast('CardBound vaults use vault-to-vault transfer only.', 'info');
      return;
    }
    onDeposit();
  };

  const handleWithdraw = () => {
    if (cardBoundMode) {
      showToast('CardBound vaults use vault-to-vault transfer only.', 'info');
      return;
    }
    onWithdraw();
  };

  const disabledStyle = 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed';

  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard className="p-6" hover={false}>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="text-amber-400" size={24} />
            Quick Actions
          </h2>
          <p className="text-white/50 text-sm mb-5">Move funds or rebalance instantly from your vault.</p>

          {cardBoundMode && (
            <div className="mb-5 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm">
              CardBound mode is active: use vault-to-vault transfer. Direct wallet deposit/withdraw is disabled.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.button
              onClick={handleDeposit}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`p-5 rounded-xl font-bold flex items-center justify-center gap-2 ${
                cardBoundMode ? disabledStyle : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              }`}
            >
              <ArrowDownToLine size={20} />
              Deposit Funds
            </motion.button>

            <motion.button
              onClick={handleWithdraw}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`p-5 rounded-xl font-bold flex items-center justify-center gap-2 ${
                cardBoundMode ? disabledStyle : 'bg-white/5 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              <ArrowUpFromLine size={20} />
              Withdraw Funds
            </motion.button>

            <motion.button
              onClick={onTransfer}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="p-5 bg-white/5 border border-white/10 text-white/80 rounded-xl font-bold hover:border-white/20 hover:text-white flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Transfer to Vault
            </motion.button>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
