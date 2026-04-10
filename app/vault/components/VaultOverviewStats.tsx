'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { containerVariants, itemVariants } from '@/lib/motion-presets';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, Users } from 'lucide-react';
import { safeParseFloat } from '@/lib/validation';

interface VaultOverviewStatsProps {
  vaultBalance: string;
  isLoadingBalance: boolean;
  usdValue: string;
  guardianCount: number | undefined;
}

export function VaultOverviewStats({ vaultBalance, isLoadingBalance, usdValue, guardianCount }: VaultOverviewStatsProps) {
  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">Total Balance</span>
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <DollarSign className="text-cyan-400" size={18} />
                </div>
              </div>
              {isLoadingBalance ? (
                <>
                  <Skeleton height={40} className="w-48 mb-1 bg-white/10" />
                  <Skeleton height={16} className="w-32 bg-white/5" />
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-white mb-1">
                    {safeParseFloat(vaultBalance, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE
                  </div>
                  <div className="text-white/40 text-sm">≈ ${safeParseFloat(usdValue, 0).toLocaleString()} USD</div>
                  <div className="text-xs text-white/40 mt-2">Updated in real time • ProofScore aware fees</div>
                </>
              )}
            </GlassCard>
          </motion.div>

          {/* Status */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">Vault Status</span>
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <CheckCircle2 className="text-emerald-400" size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-1">ACTIVE</div>
              <div className="text-white/40 text-sm">All systems secure</div>
            </GlassCard>
          </motion.div>

          {/* Guardians */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">Guardians</span>
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <Users className="text-purple-400" size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {guardianCount !== undefined ? `${guardianCount}/5` : '...'}
              </div>
              <div className="text-white/40 text-sm">
                {guardianCount && guardianCount >= 3 ? 'Recovery enabled' : 'Add guardians for recovery'}
              </div>
              <div className="text-xs text-white/40 mt-2">3+ guardians unlock recovery mode</div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
