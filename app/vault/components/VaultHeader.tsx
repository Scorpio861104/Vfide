'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { containerVariants, itemVariants } from '@/lib/motion-presets';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Shield, Plus, Key } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { isCardBoundVaultMode } from '@/lib/contracts';
import { devLog } from '@/lib/utils';

interface VaultHeaderProps {
  address: string | undefined;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<unknown>;
  isCreatingVault: boolean;
  isOnCorrectChain: boolean | undefined;
  expectedChainName: string | null | undefined;
  refetchVault: () => void;
}

export function VaultHeader({
  address, hasVault, isLoadingVault, createVault, isCreatingVault,
  isOnCorrectChain, expectedChainName, refetchVault,
}: VaultHeaderProps) {
  const { showToast } = useToast();
  const cardBoundMode = isCardBoundVaultMode();

  return (
    <section className="relative py-12 border-b border-white/5">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 flex items-center gap-3">
            Vault Manager
            <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}>
              <Shield className="text-emerald-400" size={40} />
            </motion.span>
          </h1>
          <p className="text-xl text-white/60 mb-6">
            {cardBoundMode
              ? 'Non-custodial storage with guardian-backed wallet rotation and queued transfer protection'
              : 'Non-custodial storage with dual protection: recovery + inheritance'}
          </p>
        </motion.div>

        {/* No Vault */}
        {!hasVault && !isLoadingVault && address && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="p-6 border-amber-500/30" gradient="gold" hover={false}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/20">
                    <Plus className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">No Vault Found</h3>
                    <p className="text-white/60">Create your vault to start using VFIDE securely</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      await createVault();
                      showToast('Vault created successfully!', 'success');
                      setTimeout(() => refetchVault(), 2000);
                    } catch (error) {
                      devLog.error('Vault creation error:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                      showToast(errorMessage, 'error');
                    }
                  }}
                  disabled={isCreatingVault}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  {isCreatingVault ? 'Creating...' : 'Create Vault'}
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Loading */}
        {isLoadingVault && (
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-center gap-3 py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
              />
              <p className="text-white/60">Loading vault information...</p>
            </div>
          </GlassCard>
        )}

        {/* Not Connected */}
        {!address && (
          <GlassCard className="p-6 border-red-500/30" gradient="red" hover={false}>
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-red-400 font-bold">Wallet Not Connected</p>
              <p className="text-white/60">Please connect your wallet to view your vault</p>
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openConnectModal}
                    disabled={!mounted}
                    aria-label="Connect your wallet"
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                  >
                    Connect Wallet
                  </motion.button>
                )}
              </ConnectButton.Custom>
            </div>
          </GlassCard>
        )}

        {/* Wrong Network */}
        {address && isOnCorrectChain === false && (
          <GlassCard className="p-6 border-amber-500/30" gradient="gold" hover={false}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
              <div>
                <p className="text-amber-400 font-bold mb-1">Wrong Network</p>
                <p className="text-white/60 text-sm">
                  Please switch to {expectedChainName ?? 'the correct network'} to use your vault
                </p>
              </div>
              <ConnectButton.Custom>
                {({ openChainModal, mounted }) => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openChainModal}
                    disabled={!mounted}
                    aria-label={`Switch to ${expectedChainName ?? 'the correct network'}`}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  >
                    Switch Network
                  </motion.button>
                )}
              </ConnectButton.Custom>
            </div>
          </GlassCard>
        )}

        {/* Feature Cards */}
        {hasVault && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <motion.div variants={itemVariants}>
              <GlassCard className="p-5 border-cyan-500/30" gradient="cyan">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="text-cyan-400" size={24} />
                  <span className="text-cyan-400 font-bold">{cardBoundMode ? 'Wallet Rotation' : 'Chain of Return'}</span>
                </div>
                <p className="text-white/60 text-sm">
                  {cardBoundMode
                    ? 'Lost wallet? Guardians approve a signer rotation so you regain control without using the legacy inheritance surface.'
                    : 'Lost wallet? Guardians verify your identity and help YOU regain access.'}
                </p>
              </GlassCard>
            </motion.div>
            <motion.div variants={itemVariants}>
              <GlassCard className="p-5 border-amber-500/30" gradient="gold">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="text-amber-400" size={24} />
                  <span className="text-amber-400 font-bold">{cardBoundMode ? 'Guardian Protections' : 'Next of Kin'}</span>
                </div>
                <p className="text-white/60 text-sm">
                  {cardBoundMode
                    ? 'Guardian setup, queued withdrawal review, and transfer guardrails stay active while legacy next-of-kin inheritance remains unavailable.'
                    : 'Estate planning. If you die, guardians verify and your HEIR inherits.'}
                </p>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
