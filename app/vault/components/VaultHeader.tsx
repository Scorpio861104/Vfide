'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { containerVariants, itemVariants } from '@/lib/motion-presets';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { m } from 'framer-motion';
import { Shield, Plus, Key } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { devLog } from '@/lib/utils';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { pickLocaleCopy, VAULT_HEADER_TRANSLATIONS } from '@/lib/i18n';

interface VaultHeaderProps {
  address: string | undefined;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<unknown>;
  isCreatingVault: boolean;
  isOnCorrectChain: boolean | undefined;
  expectedChainName: string | null | undefined;
  refetchVault: () => void;
  switchToPreferredChain?: () => Promise<boolean>;
  isSwitchingChain?: boolean;
  isContractConfigured?: boolean;
}

export function VaultHeader({
  address, hasVault, isLoadingVault, createVault, isCreatingVault,
  isOnCorrectChain, expectedChainName, refetchVault,
  switchToPreferredChain, isSwitchingChain, isContractConfigured,
}: VaultHeaderProps) {
  const { showToast } = useToast();
  const { locale } = useLocale();
  const copy = pickLocaleCopy(VAULT_HEADER_TRANSLATIONS, locale);
  const chain = expectedChainName ?? 'Base';
  const withChain = (value: string) => value.replace(/\{chain\}/g, chain);

  return (
    <section className="relative py-12 border-b border-white/5">
      <div className="container mx-auto px-4 max-w-6xl">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="badge-live mb-4">
            <Shield size={12} /> {copy.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 flex items-center gap-3 tracking-tight">
            <span className="bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent">{copy.title}</span>
            <m.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}>
              <Shield className="text-emerald-400" size={36} />
            </m.span>
          </h1>
          <p className="text-xl text-white/60 mb-6">
            {copy.subtitle}
          </p>
        </m.div>

        {/* No Vault */}
        {!hasVault && !isLoadingVault && address && isOnCorrectChain && isContractConfigured !== false && (
          <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="p-6 border-amber-500/30" gradient="gold" hover={false}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/20">
                    <Plus className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{copy.noVaultTitle}</h3>
                    <p className="text-white/60">{withChain(copy.noVaultDesc)}</p>
                  </div>
                </div>
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      const result = await createVault() as { transactionHash?: string; vaultAddress?: string } | undefined;
                      if (result?.vaultAddress) {
                        showToast(`Vault created: ${result.vaultAddress.slice(0, 6)}…${result.vaultAddress.slice(-4)}`, 'success');
                      } else {
                        showToast('Vault created successfully!', 'success');
                      }
                      void refetchVault();
                    } catch (error) {
                      devLog.error('Vault creation error:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                      showToast(errorMessage, 'error');
                    }
                  }}
                  disabled={isCreatingVault}
                  aria-busy={isCreatingVault}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  {isCreatingVault ? copy.creating : copy.createVault}
                </m.button>
              </div>
            </GlassCard>
          </m.div>
        )}

        {/* Loading */}
        {isLoadingVault && (
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-center gap-3 py-4">
              <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full"
              />
              <p className="text-white/60">{copy.loading}</p>
            </div>
          </GlassCard>
        )}

        {/* Not Connected */}
        {!address && (
          <GlassCard className="p-6 border-red-500/30" gradient="red" hover={false}>
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-red-400 font-bold">{copy.walletNotConnected}</p>
              <p className="text-white/60">{copy.connectPrompt}</p>
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => (
                  <m.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openConnectModal}
                    disabled={!mounted}
                    aria-label="Connect your wallet"
                    className="px-6 py-3 bg-gradient-to-r from-accent to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-accent/25 disabled:opacity-50"
                  >
                    Connect Wallet
                  </m.button>
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
                <p className="text-amber-400 font-bold mb-1">{withChain(copy.switchTo)}</p>
                <p className="text-white/60 text-sm">
                  {withChain(copy.switchDesc)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    if (switchToPreferredChain) {
                      const ok = await switchToPreferredChain();
                      if (!ok) {
                        showToast(`Could not switch to ${expectedChainName ?? 'the network'}. Please switch manually in your wallet.`, 'error');
                      }
                    }
                  }}
                  disabled={isSwitchingChain || !switchToPreferredChain}
                  aria-label={`Switch to ${expectedChainName ?? 'the correct network'}`}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  {isSwitchingChain ? copy.switching : withChain(copy.switchButton)}
                </m.button>
                {/* Fallback: open RainbowKit's chain modal for users whose wallet doesn't support programmatic switching */}
                <ConnectButton.Custom>
                  {({ openChainModal, mounted }) => (
                    <button
                      onClick={openChainModal}
                      disabled={!mounted}
                      aria-label="Open network selector"
                      className="px-3 py-3 text-white/60 hover:text-white text-sm underline disabled:opacity-50"
                    >
                      Manual
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Contracts not deployed on this chain (separate from "wrong chain") */}
        {address && isOnCorrectChain && isContractConfigured === false && (
          <GlassCard className="p-6 border-red-500/30" gradient="red" hover={false}>
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <p className="text-red-400 font-bold">{copy.notDeployedTitle}</p>
              <p className="text-white/60 text-sm max-w-md">
                {withChain(copy.notDeployedDesc)}
              </p>
            </div>
          </GlassCard>
        )}

        {/* Feature Cards */}
        {hasVault && (
          <m.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <m.div variants={itemVariants}>
              <GlassCard className="p-5 border-accent/30" gradient="cyan">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="text-accent" size={24} />
                  <span className="text-accent font-bold">Wallet Rotation</span>
                </div>
                <p className="text-white/60 text-sm">
                  Lost wallet? Guardians approve a signer rotation so you regain control of the vault.
                </p>
              </GlassCard>
            </m.div>
            <m.div variants={itemVariants}>
              <GlassCard className="p-5 border-amber-500/30" gradient="gold">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="text-amber-400" size={24} />
                  <span className="text-amber-400 font-bold">Guardian Protections</span>
                </div>
                <p className="text-white/60 text-sm">
                  Guardian setup, queued withdrawal review, and transfer guardrails protect your vault from unauthorized drain.
                </p>
              </GlassCard>
            </m.div>
          </m.div>
        )}
      </div>
    </section>
  );
}
