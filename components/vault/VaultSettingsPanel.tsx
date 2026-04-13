/**
 * VaultSettingsPanel - Advanced vault management settings
 * 
 * Features:
 * - Balance snapshot mode for abnormal transaction detection
 * - Pending transaction management
 * - Threshold configuration display
 * - Guardian maturity tracking
 */

'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  Camera, 
  Trash2,
  CheckCircle,
  XCircle,
  Settings,
  Info
} from 'lucide-react'
import { formatEther } from 'viem'
import {
  useUserVault,
  useVaultBalance,
  useAbnormalTransactionThreshold,
  useBalanceSnapshot,
  useSetBalanceSnapshotMode,
  useUpdateBalanceSnapshot,
  usePendingTransaction,
  useApprovePendingTransaction,
  useExecutePendingTransaction,
  useCleanupExpiredTransaction,
} from '@/lib/vfide-hooks'
import { isCardBoundVaultMode } from '@/lib/contracts'
import { safeParseInt } from '@/lib/validation';

// Dummy address for hooks when vault is not yet available
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export function VaultSettingsPanel() {
  const { address } = useAccount()
  const { vaultAddress } = useUserVault()
  const { balanceRaw } = useVaultBalance()
  const cardBoundMode = isCardBoundVaultMode()
  
  // Use zero address as fallback (hooks will return default values)
  const safeVaultAddress = vaultAddress ?? ZERO_ADDRESS
  
  const { threshold, usePercentage, percentageBps } = useAbnormalTransactionThreshold(safeVaultAddress)
  const { useSnapshot, snapshot } = useBalanceSnapshot(safeVaultAddress)
  const { pendingTxCount } = usePendingTransaction(safeVaultAddress, 0)

  const [selectedTxId, setSelectedTxId] = useState<number>(0)
  const { pendingTx } = usePendingTransaction(safeVaultAddress, selectedTxId)

  const { setSnapshotMode, isLoading: settingSnapshot } = useSetBalanceSnapshotMode(safeVaultAddress)
  const { updateSnapshot, isLoading: updatingSnapshot } = useUpdateBalanceSnapshot(safeVaultAddress)
  const { approve, isLoading: approving } = useApprovePendingTransaction(safeVaultAddress)
  const { execute, isLoading: executing } = useExecutePendingTransaction(safeVaultAddress)
  const { cleanup, isLoading: cleaning } = useCleanupExpiredTransaction(safeVaultAddress)

  if (!address || !vaultAddress) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Connect wallet to access vault settings</p>
      </div>
    )
  }

  if (cardBoundMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold">Vault Settings</h2>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-cyan-400 mt-0.5" />
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-white">CardBound Vault Mode Active</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Advanced legacy vault controls are unavailable for CardBound vaults.
                </p>
              </div>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  Balance snapshots, abnormal transaction queues, and legacy pending transaction approval flows belong to the older UserVault implementation and are not exposed by the active CardBound vault contract.
                </p>
                <p>
                  Use CardBound transfer authorization, guardian controls, and hub-managed security features instead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleToggleSnapshot = async () => {
    await setSnapshotMode(!useSnapshot)
  }

  const handleUpdateSnapshot = async () => {
    await updateSnapshot()
  }

  const handleApproveTx = async () => {
    await approve(selectedTxId)
  }

  const handleExecuteTx = async () => {
    await execute(selectedTxId)
  }

  const handleCleanupTx = async () => {
    await cleanup(selectedTxId)
  }

  const thresholdPercentage = percentageBps ? (percentageBps / 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold">Vault Settings</h2>
      </div>

      {/* Abnormal Transaction Threshold */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-orange-400">Abnormal Transaction Detection</h3>
          </div>
          <div className="text-xs bg-orange-500/20 px-2 py-1 rounded text-orange-300">
            {usePercentage ? 'Percentage Mode' : 'Fixed Amount'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Current Threshold</div>
            <div className="text-2xl font-bold text-white">
              {usePercentage 
                ? `${thresholdPercentage}% of balance`
                : `${formatEther(threshold)} VFIDE`
              }
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ {formatEther(threshold)} VFIDE
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Vault Balance</div>
            <div className="text-2xl font-bold text-white">
              {formatEther(balanceRaw)} VFIDE
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Transactions above threshold require approval
            </div>
          </div>
        </div>

        <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2 text-sm text-blue-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Transactions exceeding this threshold will be flagged for manual approval, 
              providing an extra layer of security against unauthorized large transfers.
            </div>
          </div>
        </div>
      </motion.div>

      {/* Balance Snapshot Mode */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-purple-400">Balance Snapshot Mode</h3>
          </div>
          <button
            onClick={handleToggleSnapshot}
            disabled={settingSnapshot}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              useSnapshot
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } disabled:opacity-50`}
          >
            {settingSnapshot ? 'Updating...' : useSnapshot ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {useSnapshot && (
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Snapshot Balance</div>
              <div className="text-2xl font-bold text-white">
                {formatEther(snapshot)} VFIDE
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Locked reference for percentage calculations
              </div>
            </div>

            <button
              onClick={handleUpdateSnapshot}
              disabled={updatingSnapshot}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-bold transition-all"
            >
              {updatingSnapshot ? 'Updating Snapshot...' : 'Update Snapshot to Current Balance'}
            </button>
          </div>
        )}

        <div className="mt-4 bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2 text-sm text-purple-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Snapshot Mode:</strong> When enabled, percentage-based thresholds use a locked 
              balance snapshot instead of current balance. This prevents attackers from draining your 
              vault in small chunks by lowering the threshold as balance decreases.
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pending Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-yellow-400">Pending Transactions</h3>
          </div>
          <div className="text-sm bg-yellow-500/20 px-3 py-1 rounded text-yellow-300">
            {pendingTxCount.toString()} pending
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={selectedTxId}
              onChange={(e) =>  setSelectedTxId(safeParseInt(e.target.value, 0, { min: 0 }))}
             
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          {pendingTx && (
            <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">To Vault</div>
                  <div className="text-white font-mono text-xs">
                    {pendingTx.toVault.slice(0, 10)}...{pendingTx.toVault.slice(-8)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Amount</div>
                  <div className="text-white font-bold">
                    {formatEther(pendingTx.amount)} VFIDE
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  {pendingTx.approved ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={pendingTx.approved ? 'text-green-400' : 'text-gray-400'}>
                    {pendingTx.approved ? 'Approved' : 'Not Approved'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {pendingTx.executed ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={pendingTx.executed ? 'text-green-400' : 'text-gray-400'}>
                    {pendingTx.executed ? 'Executed' : 'Not Executed'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  onClick={handleApproveTx}
                  disabled={pendingTx.approved || pendingTx.executed || approving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                >
                  {approving ? '...' : 'Approve'}
                </button>
                <button
                  onClick={handleExecuteTx}
                  disabled={!pendingTx.approved || pendingTx.executed || executing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                >
                  {executing ? '...' : 'Execute'}
                </button>
                <button
                  onClick={handleCleanupTx}
                  disabled={cleaning}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          )}

          {!pendingTx && selectedTxId > 0 && (
            <div className="text-center text-gray-400 py-4">
              No pending transaction found with ID {selectedTxId}
            </div>
          )}
        </div>

        <div className="mt-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2 text-sm text-yellow-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Transactions flagged as abnormal require manual approval before execution. 
              You can approve, execute, or clean up expired transactions here. Cleanup frees 
              storage and saves gas for future operations.
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Snapshot Mode</div>
          <div className={`text-lg font-bold ${useSnapshot ? 'text-green-400' : 'text-gray-400'}`}>
            {useSnapshot ? 'Active' : 'Inactive'}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Threshold Type</div>
          <div className="text-lg font-bold text-white">
            {usePercentage ? 'Percentage' : 'Fixed'}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Pending TXs</div>
          <div className="text-lg font-bold text-yellow-400">
            {pendingTxCount.toString()}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Protection Level</div>
          <div className="text-lg font-bold text-purple-400">
            {useSnapshot ? 'Enhanced' : 'Standard'}
          </div>
        </div>
      </div>
    </div>
  )
}
