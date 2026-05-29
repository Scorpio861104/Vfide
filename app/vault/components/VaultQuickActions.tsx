'use client';

/**
 * VaultQuickActions — top-of-vault quick action buttons.
 *
 * Pre-cleanup, this component rendered three buttons (Deposit, Withdraw,
 * Transfer to Vault) where the first two were always disabled in
 * CardBound mode (the only mode) and showed a toast saying "use
 * vault-to-vault transfer instead". The underlying handlers in
 * useVaultOperations.handleDeposit/handleWithdraw confirmed it:
 * `handleDeposit` is a stub that always errors, and the working code
 * path is the signed vault-to-vault transfer.
 *
 * Now the panel shows just the working action. Deposits into a CardBound
 * vault arrive from other vaults via vault-to-vault transfers, or from
 * protocol-level operations (mint, airdrop) — not from a per-user
 * "deposit from your wallet" button.
 */

import { GlassCard } from '@/components/ui/GlassCard';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { Zap, RefreshCw } from 'lucide-react';

interface VaultQuickActionsProps {
  onTransfer: () => void;
}

export function VaultQuickActions({ onTransfer }: VaultQuickActionsProps) {
  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard className="p-6" hover={false}>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="text-amber-400" size={24} />
            Quick Actions
          </h2>
          <p className="text-white/50 text-sm mb-5">
            Move funds between vaults instantly using a signed vault-to-vault transfer.
          </p>

          <m.button
            onClick={onTransfer}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full md:max-w-md p-5 bg-gradient-to-r from-accent to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-accent/25 flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} />
            Transfer to Vault
          </m.button>
        </GlassCard>
      </div>
    </section>
  );
}
