'use client';

export const dynamic = 'force-dynamic';

/**
 * Vault Settings Page
 *
 * Pre-cleanup, this page showed legacy UserVault features (Balance
 * Snapshot, Abnormal TX Detection, Pending TX Queue, Guardian Maturity,
 * Recovery Protection, Inheritance Guard) that are not exposed by the
 * active CardBound vault contract. Both panels short-circuited or
 * fell back to placeholders. The feature-cards grid below them
 * described capabilities the user could never actually use.
 *
 * Rewrote to honestly describe the CardBound-only feature set.
 */

import { Footer } from '@/components/layout/Footer'
import { VaultSettingsPanel } from '@/components/vault/VaultSettingsPanel'
import { GuardianManagementPanel } from '@/components/security/GuardianManagementPanel'
import { SpendLimitsConfigurator } from '@/components/vault/SpendLimitsConfigurator'
import { AppLockSettings } from '@/components/security/AppLockSettings'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Vault, Shield, Settings, Sliders, Fingerprint, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function VaultSettingsPage() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white md:pt-[3.5rem]">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4">
              <Vault className="w-10 h-10" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
              Vault Settings
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              CardBound vault security configuration and guardian management
            </p>
          </div>

          {/* Emergency link — visible up top */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/vault/lock"
              className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">Suspect your wallet is compromised?</div>
                <div className="text-xs text-gray-400">
                  Open the Lock My Vault panic page — cancel queued items, propose rotation, alert guardians.
                </div>
              </div>
              <span className="text-red-400 text-sm font-medium">Open →</span>
            </Link>
          </motion.div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-8 mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold">Transaction Controls</h2>
              </div>
              <ErrorBoundary>
                <VaultSettingsPanel />
              </ErrorBoundary>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold">Spend Limits</h2>
              </div>
              <ErrorBoundary>
                <SpendLimitsConfigurator />
              </ErrorBoundary>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold">Guardian Protection</h2>
              </div>
              <ErrorBoundary>
                <GuardianManagementPanel />
              </ErrorBoundary>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Fingerprint className="w-6 h-6 text-pink-400" />
                <h2 className="text-2xl font-bold">Device App Lock</h2>
              </div>
              <ErrorBoundary>
                <AppLockSettings />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* Features Grid — CardBound features only */}
          <div className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">CardBound Security Features</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-cyan-600/20 border-2 border-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🔑</span>
                </div>
                <div className="font-bold text-cyan-400 mb-2">Wallet Rotation</div>
                <div className="text-xs text-gray-400">
                  Move the active signer for the vault to a new wallet address with guardian approval and a timelock
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-amber-600/20 border-2 border-amber-500 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">⏳</span>
                </div>
                <div className="font-bold text-amber-400 mb-2">Withdrawal Queue</div>
                <div className="text-xs text-gray-400">
                  Large withdrawals enter a timelocked queue that the owner can cancel before execution
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-600/20 border-2 border-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🛡️</span>
                </div>
                <div className="font-bold text-blue-400 mb-2">Guardian Threshold</div>
                <div className="text-xs text-gray-400">
                  M-of-N guardians must approve wallet rotation. Threshold is set when guardian setup is finalized.
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-green-600/20 border-2 border-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">📜</span>
                </div>
                <div className="font-bold text-green-400 mb-2">Spend Limits</div>
                <div className="text-xs text-gray-400">
                  Per-transfer and per-day spend caps, plus a large-transfer threshold that triggers the queue
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-yellow-600/20 border-2 border-yellow-500 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">⚖️</span>
                </div>
                <div className="font-bold text-yellow-400 mb-2">Guardian Governance</div>
                <div className="text-xs text-gray-400">
                  Guardians approve wallet-rotation and vault-protection actions; configure heirs in the vault's Inheritance section
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-pink-600/20 border-2 border-pink-500 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🔒</span>
                </div>
                <div className="font-bold text-pink-400 mb-2">Hub-Managed Recovery</div>
                <div className="text-xs text-gray-400">
                  The VaultHub coordinates guardian-setup completion, expiry, and pending-rotation finalization
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="mt-8 bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-3 text-blue-400">Security Best Practices</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div><strong className="text-white">1. Complete Guardian Setup:</strong> Add at least 2 guardians, set a threshold of at least 2, then finalize setup before the grace window expires</div>
              <div><strong className="text-white">2. Configure Spend Limits:</strong> Set per-transfer and per-day caps that match your real spending patterns; the large-transfer threshold queues anything above it</div>
              <div><strong className="text-white">3. Guardian Diversity:</strong> Choose guardians from different devices/locations to prevent single points of failure</div>
              <div><strong className="text-white">4. Verify Rotations Off-Chain:</strong> Before approving a wallet rotation as a guardian, confirm with the owner through a separate channel</div>
              <div><strong className="text-white">5. Use the Withdrawal Queue:</strong> The queue is your last line of defence — keep the large-transfer threshold tight enough to catch unexpected drains</div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  )
}
