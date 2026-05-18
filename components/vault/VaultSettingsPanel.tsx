'use client'

/**
 * VaultSettingsPanel
 *
 * Pre-cleanup, this panel had a 286-line legacy UserVault implementation
 * (balance-snapshot toggle, abnormal-transaction-threshold UI, pending-
 * transaction approve/execute/cleanup flows) gated behind an early
 * `if (cardBoundMode) return <PlaceholderMessage />` short-circuit at the
 * top of the component. Since `isCardBoundVaultMode()` always returns
 * true, the placeholder was the only path that ever rendered — the rest
 * was unreachable.
 *
 * Removed:
 *   - 286 lines of legacy-only JSX below the short-circuit
 *   - 10 legacy hook calls (`useAbnormalTransactionThreshold`,
 *     `useSetBalanceSnapshotMode`, `useUpdateBalanceSnapshot`,
 *     `useBalanceSnapshot`, `usePendingTransaction` ×2,
 *     `useApprovePendingTransaction`, `useExecutePendingTransaction`,
 *     `useCleanupExpiredTransaction`)
 *   - The matching state, handlers, and helper variables
 *
 * Kept: the CardBound info card explaining that legacy advanced controls
 * aren't applicable here, plus the not-connected fallback.
 */

import { useAccount } from 'wagmi'
import { useUserVault } from '@/hooks/useVaultHooks'
import { Settings, Shield } from 'lucide-react'

export function VaultSettingsPanel() {
  const { address } = useAccount()
  const { vaultAddress } = useUserVault()

  if (!address || !vaultAddress) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Connect wallet to access vault settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold">Vault Settings</h2>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-3 min-w-0">
            <div>
              <h3 className="text-lg font-bold text-white">CardBound Vault Mode Active</h3>
              <p className="text-sm text-gray-400 mt-1">
                Advanced legacy vault controls are unavailable for CardBound vaults.
              </p>
            </div>
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                Balance snapshots, abnormal transaction queues, and legacy pending transaction
                approval flows belong to the older UserVault implementation and are not exposed
                by the active CardBound vault contract.
              </p>
              <p>
                Use CardBound transfer authorization, guardian controls, and hub-managed
                security features instead.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
