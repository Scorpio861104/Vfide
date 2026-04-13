/**
 * GuardianManagementPanel - Add/remove guardians and manage M-of-N threshold
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  useUserVault, 
  useVaultGuardians, 
  useGuardianCancelInheritance,
  useInheritanceStatus,
} from '@/lib/vfide-hooks'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES, isCardBoundVaultMode } from '@/lib/contracts'
import { Users, Plus, X, Shield, AlertTriangle, Clock } from 'lucide-react'
import { isAddress, zeroAddress } from 'viem'
import { safeParseInt } from '@/lib/validation'

const ZERO_ADDRESS = zeroAddress

export function GuardianManagementPanel() {
  const { address: userAddress } = useAccount()
  const { vaultAddress } = useUserVault()
  const cardBoundMode = isCardBoundVaultMode()
  const guardians = useVaultGuardians(vaultAddress || undefined)
  
  const [newGuardian, setNewGuardian] = useState('')
  const [removeAddress, setRemoveAddress] = useState('')
  const [newThreshold, setNewThreshold] = useState(3)
  const [addError, setAddError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  
  const { writeContract: addGuardian, data: addHash, isPending: isAdding } = useWriteContract()
  const { writeContract: removeGuardian, data: removeHash, isPending: isRemoving } = useWriteContract()
  const { writeContract: setThreshold, data: thresholdHash, isPending: isSettingThreshold } = useWriteContract()
  
  const { isSuccess: addSuccess } = useWaitForTransactionReceipt({ hash: addHash })
  const { isSuccess: removeSuccess } = useWaitForTransactionReceipt({ hash: removeHash })
  const { isSuccess: thresholdSuccess } = useWaitForTransactionReceipt({ hash: thresholdHash })

  if (!vaultAddress) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Create a vault to manage guardians</p>
      </div>
    )
  }

  const handleAddGuardian = () => {
    setAddError(null)
    
    if (!isAddress(newGuardian)) {
      setAddError('Invalid Ethereum address format')
      return
    }
    
    if (newGuardian.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      setAddError('Cannot add zero address as guardian')
      return
    }
    
    if (userAddress && newGuardian.toLowerCase() === userAddress.toLowerCase()) {
      setAddError('Cannot add yourself as a guardian')
      return
    }
    
    if (vaultAddress && newGuardian.toLowerCase() === vaultAddress.toLowerCase()) {
      setAddError('Cannot add vault address as guardian')
      return
    }
    
    addGuardian({
      address: CONTRACT_ADDRESSES.GuardianRegistry,
      abi: [{
        name: 'addGuardian',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'vault', type: 'address' },
          { name: 'guardian', type: 'address' }
        ],
        outputs: [],
      }],
      functionName: 'addGuardian',
      args: [vaultAddress, newGuardian as `0x${string}`],
    })
    
    setNewGuardian('')
  }

  const handleRemoveGuardian = () => {
    setRemoveError(null)
    
    if (!isAddress(removeAddress)) {
      setRemoveError('Invalid Ethereum address format')
      return
    }
    
    if (removeAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      setRemoveError('Invalid address')
      return
    }
    
    removeGuardian({
      address: CONTRACT_ADDRESSES.GuardianRegistry,
      abi: [{
        name: 'removeGuardian',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'vault', type: 'address' },
          { name: 'guardian', type: 'address' }
        ],
        outputs: [],
      }],
      functionName: 'removeGuardian',
      args: [vaultAddress, removeAddress as `0x${string}`],
    })
    
    setRemoveAddress('')
  }

  const handleSetThreshold = () => {
    setThresholdError(null)
    
    if (newThreshold < 1 || newThreshold > guardians.guardianCount) {
      setThresholdError(`Threshold must be between 1 and ${guardians.guardianCount}`)
      return
    }
    
    setThreshold({
      address: CONTRACT_ADDRESSES.GuardianRegistry,
      abi: [{
        name: 'setThreshold',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'vault', type: 'address' },
          { name: 'mOfN', type: 'uint8' }
        ],
        outputs: [],
      }],
      functionName: 'setThreshold',
      args: [vaultAddress, newThreshold],
    })
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-purple-400" />
          <div>
            <div className="font-bold text-xl">Guardian Protection</div>
            <div className="text-sm text-gray-400">M-of-N Multi-Guardian Security</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-400">{guardians.guardianCount}</div>
            <div className="text-sm text-gray-400">Total Guardians</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">{guardians.threshold}</div>
            <div className="text-sm text-gray-400">Lock Threshold</div>
          </div>
        </div>
      </div>

      {/* Add Guardian */}
      <motion.div
        className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-green-400" />
          <div className="font-bold text-lg">Add Guardian</div>
        </div>
        
        <div className="space-y-3">
          <div>
            <input
              type="text"
              value={newGuardian}
              onChange={(e) =>  {
                setNewGuardian(e.target.value)
                setAddError(null)
              }}
             
              aria-label="Guardian address to add"
              aria-describedby={addError ? "add-guardian-error" : undefined}
              className={`w-full bg-black/40 border rounded-lg px-4 py-3 text-white  focus:outline-none ${
                addError ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-purple-500'
              }`}
            />
            {addError && (
              <div id="add-guardian-error" className="mt-2 text-sm text-red-400 flex items-center gap-2" role="alert">
                <AlertTriangle className="w-4 h-4" />
                {addError}
              </div>
            )}
          </div>
          
          <button
            onClick={handleAddGuardian}
            disabled={isAdding || !isAddress(newGuardian)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            {isAdding ? 'Adding...' : 'Add Guardian'}
          </button>
          
          {addSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
              ✅ Guardian added successfully
            </div>
          )}
        </div>
        
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <div>• Guardians can vote to lock your vault if suspicious activity detected</div>
          <div>• Choose trusted friends, family, or hardware wallets</div>
          <div>• Guardians must wait 7 days before they can vote (maturity period)</div>
        </div>
      </motion.div>

      {/* Remove Guardian */}
      <motion.div
        className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <X className="w-6 h-6 text-red-400" />
          <div className="font-bold text-lg">Remove Guardian</div>
        </div>
        
        <div className="space-y-3">
          <div>
            <input
              type="text"
              value={removeAddress}
              onChange={(e) =>  {
                setRemoveAddress(e.target.value)
                setRemoveError(null)
              }}
             
              aria-label="Guardian address to remove"
              aria-describedby={removeError ? "remove-guardian-error" : undefined}
              className={`w-full bg-black/40 border rounded-lg px-4 py-3 text-white  focus:outline-none ${
                removeError ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-red-500'
              }`}
            />
            {removeError && (
              <div id="remove-guardian-error" className="mt-2 text-sm text-red-400 flex items-center gap-2" role="alert">
                <AlertTriangle className="w-4 h-4" />
                {removeError}
              </div>
            )}
          </div>
          
          <button
            onClick={handleRemoveGuardian}
            disabled={isRemoving || !isAddress(removeAddress)}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            {isRemoving ? 'Removing...' : 'Remove Guardian'}
          </button>
          
          {removeSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
              ✅ Guardian removed successfully
            </div>
          )}
        </div>
        
        <div className="mt-4 bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
          <div className="text-xs text-orange-400">
            ⚠️ Cannot remove guardians who have active votes on pending lock attempts
          </div>
        </div>
      </motion.div>

      {/* Set Threshold */}
      <motion.div
        className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-blue-400" />
          <div className="font-bold text-lg">Set Lock Threshold</div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Guardians Required to Lock ({newThreshold} of {guardians.guardianCount})
            </label>
            <input
              type="range"
              min="1"
              max={Math.max(guardians.guardianCount, 1)}
              value={newThreshold}
              onChange={(e) =>  {
                setNewThreshold(safeParseInt(e.target.value, 1, { min: 1, max: guardians.guardianCount }))
                setThresholdError(null)
              }}
              aria-label="Guardian threshold for locking vault"
              className="w-full"
            />
            <div className="text-center text-white font-bold mt-2">
              {newThreshold} / {guardians.guardianCount} guardians
            </div>
            {thresholdError && (
              <div className="mt-2 text-sm text-red-400 flex items-center justify-center gap-2" role="alert">
                <AlertTriangle className="w-4 h-4" />
                {thresholdError}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSetThreshold}
            disabled={isSettingThreshold || guardians.guardianCount === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            {isSettingThreshold ? 'Updating...' : 'Update Threshold'}
          </button>
          
          {thresholdSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
              ✅ Threshold updated successfully
            </div>
          )}
        </div>
        
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <div>• Higher threshold = more consensus needed (more secure, harder to lock)</div>
          <div>• Lower threshold = faster response (easier to lock in emergency)</div>
          <div>• Default: ceil(N/2) if not set (e.g., 3 of 5, 5 of 9)</div>
        </div>
      </motion.div>

      {!cardBoundMode ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-2 border-orange-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h3 className="text-xl font-bold text-orange-400">Inheritance Protection</h3>
          </div>

          <InheritanceCancellationSection vaultAddress={vaultAddress} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border-2 border-gray-700 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold text-amber-300">Legacy Inheritance Controls Disabled</h3>
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <p>
              Next-of-kin inheritance cancellation is part of the legacy UserVault recovery model and is not supported in CardBound vault mode.
            </p>
            <p>
              CardBound vault security relies on guardian governance, wallet rotation, and hub-level protections instead of inheritance request workflows.
            </p>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
        <div className="text-sm font-bold text-blue-400 mb-2">How Guardian Protection Works</div>
        <div className="text-xs text-gray-400 space-y-2">
          <div><strong>1. Add Guardians:</strong> Choose trusted addresses to protect your vault</div>
          <div><strong>2. Set Threshold:</strong> Define how many guardians must agree to lock vault</div>
          <div><strong>3. Guardian Votes:</strong> When suspicious activity detected, guardians cast lock votes</div>
          <div><strong>4. Auto-Lock:</strong> When threshold reached, vault automatically locks</div>
          <div><strong>5. DAO Override:</strong> Only DAO can unlock guardian-locked vaults</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inheritance Cancellation Section - Guardian voting to cancel fraudulent inheritance
 */
function InheritanceCancellationSection({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { nextOfKin, hasNextOfKin } = useInheritanceStatus(vaultAddress)
  const { cancelInheritance, isLoading, isSuccess } = useGuardianCancelInheritance(vaultAddress)

  const handleCancelInheritance = async () => {
    const result = await cancelInheritance()
    if (!result.success) {
      alert(`Failed to cancel inheritance: ${result.error}`)
    }
  }

  if (!hasNextOfKin) {
    return (
      <div className="text-center py-6 text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <div>No Next of Kin configured for this vault</div>
        <div className="text-xs mt-1">Inheritance protection not applicable</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900/50 rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-2">Next of Kin</div>
        <div className="text-white font-mono text-sm break-all">
          {nextOfKin}
        </div>
      </div>

      <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
        <div className="text-sm text-orange-300 space-y-2">
          <div className="font-bold mb-2">Guardian Protection Against False Claims:</div>
          <div className="text-xs">
            • If Next of Kin files inheritance claim while owner is traveling/unreachable
          </div>
          <div className="text-xs">
            • Guardians can vote to cancel the fraudulent request
          </div>
          <div className="text-xs">
            • Requires 2/3 guardians to approve cancellation (same as recovery threshold)
          </div>
          <div className="text-xs">
            • Protects against premature or malicious inheritance attempts
          </div>
        </div>
      </div>

      <button
        onClick={handleCancelInheritance}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition-all"
      >
        {isLoading ? 'Voting to Cancel...' : 'Vote to Cancel Inheritance Request'}
      </button>

      {isSuccess && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
          ✅ Cancellation vote recorded. Waiting for other guardians...
        </div>
      )}

      <div className="text-xs text-gray-400 text-center">
        This action requires consensus from multiple guardians
      </div>
    </div>
  )
}
