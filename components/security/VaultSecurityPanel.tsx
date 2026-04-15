/**
 * VaultSecurityPanel - Comprehensive vault security dashboard
 * Shows lock status, quarantine, guardians, and self-panic controls
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  useUserVault, 
  useIsVaultLocked, 
  useQuarantineStatus, 
  useCanSelfPanic, 
  useSelfPanic,
  useVaultGuardians,
  useGuardianLockStatus,
  useEmergencyStatus
} from '@/lib/vfide-hooks'
import { Shield, AlertTriangle, Lock, Clock, Users, Zap } from 'lucide-react'
import { safeParseInt } from '@/lib/validation'

export function VaultSecurityPanel() {
  const { vaultAddress } = useUserVault()
  const { isLocked } = useIsVaultLocked(vaultAddress || undefined)
  const quarantineData = useQuarantineStatus(vaultAddress || undefined)
  const panicData = useCanSelfPanic()
  const { selfPanic, isPanicking, isSuccess, supportsDuration } = useSelfPanic()
  const guardians = useVaultGuardians(vaultAddress || undefined)
  const guardianLock = useGuardianLockStatus(vaultAddress || undefined)
  const emergency = useEmergencyStatus()
  
  const [panicDuration, setPanicDuration] = useState(24)
  const [showPanicConfirm, setShowPanicConfirm] = useState(false)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  
  // Update time every minute for accurate countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60000)
    return () => clearInterval(interval)
  }, [])
  
  // Compute panic status from raw timestamps
  const cooldownRemaining = Math.max(0, (panicData.lastPanicTime + panicData.cooldownSeconds) - now)
  const ageRemaining = panicData.creationTime > 0 ? Math.max(0, (panicData.creationTime + panicData.minAgeSeconds) - now) : 0
  const canPanic = cooldownRemaining === 0 && ageRemaining === 0
  const cooldownHours = Math.floor(cooldownRemaining / 3600)
  const cooldownMinutes = Math.floor((cooldownRemaining % 3600) / 60)
  const ageMinutes = Math.floor(ageRemaining / 60)
  
  // Compute quarantine status from raw timestamp
  const quarantineRemaining = Math.max(0, quarantineData.quarantineUntil - now)
  const hasTimer = quarantineData.supportsTimer && quarantineRemaining > 0
  const isQuarantined = quarantineData.isQuarantined || hasTimer
  const remainingHours = Math.floor(quarantineRemaining / 3600)
  const remainingMinutes = Math.floor((quarantineRemaining % 3600) / 60)
  
  const quarantine = {
    isQuarantined,
    remainingHours,
    remainingMinutes,
    quarantineUntil: quarantineData.quarantineUntil,
    isLoading: quarantineData.isLoading
  }

  if (!vaultAddress) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Create a vault to access security features</p>
      </div>
    )
  }

  const handleSelfPanic = () => {
    selfPanic(panicDuration)
    setShowPanicConfirm(false)
  }

  return (
    <div className="space-y-6">
      {/* Emergency Alert */}
      {emergency.isEmergency && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border-2 border-red-500 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <div className="font-bold text-red-500">
                {emergency.isHalted ? 'SYSTEM EMERGENCY HALT' : 'GLOBAL RISK ACTIVE'}
              </div>
              <div className="text-sm text-gray-400">
                {emergency.isHalted 
                  ? 'All vault operations suspended by DAO'
                  : 'Enhanced security protocols active'
                }
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lock Status */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`bg-gradient-to-br ${
            isLocked 
              ? 'from-red-900/20 to-orange-900/20 border-red-500/30' 
              : 'from-green-900/20 to-emerald-900/20 border-green-500/30'
          } border-2 rounded-xl p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Lock className={`w-8 h-8 ${isLocked ? 'text-red-500' : 'text-green-500'}`} />
              <div>
                <div className="font-bold text-xl">
                  {isLocked ? 'LOCKED' : 'UNLOCKED'}
                </div>
                <div className="text-sm text-gray-400">Vault Status</div>
              </div>
            </div>
          </div>
          
          {isLocked && (
            <div className="text-sm text-gray-300 space-y-1">
              {guardianLock.isLocked && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span>{hasTimer ? 'Guardian Lock Active' : 'Vault Pause Active'}</span>
                </div>
              )}
              {quarantine.isQuarantined && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span>{hasTimer ? `Quarantined for ${quarantine.remainingHours}h ${quarantine.remainingMinutes}m` : 'Paused until manually unpaused'}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Guardian Info */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-2 border-blue-500/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <div className="font-bold text-xl">Guardians</div>
              <div className="text-sm text-gray-400">M-of-N Protection</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Guardians:</span>
              <span className="font-bold text-white">{guardians.guardianCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Lock Threshold:</span>
              <span className="font-bold text-white">{guardians.threshold} required</span>
            </div>
            {guardianLock.approvals > 0 && !guardianLock.isLocked && (
              <div className="flex justify-between items-center">
                <span className="text-yellow-400">Pending Votes:</span>
                <span className="font-bold text-yellow-400">
                  {guardianLock.approvals} / {guardians.threshold}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quarantine Status */}
      {quarantine.isQuarantined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-900/20 border-2 border-yellow-500/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="font-bold text-xl text-yellow-400">Quarantine Active</div>
              <div className="text-sm text-gray-400">{hasTimer ? 'Auto-unlock when timer expires' : 'Manual unpause required'}</div>
            </div>
          </div>
          
          {hasTimer ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{quarantine.remainingHours}h</div>
                <div className="text-xs text-gray-400">Hours Left</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{quarantine.remainingMinutes}m</div>
                <div className="text-xs text-gray-400">Minutes Left</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {new Date(quarantine.quarantineUntil * 1000).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-400">Until Date</div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-yellow-500/20 bg-black/20 p-4 text-sm text-gray-300">
              CardBound vaults use a direct pause rather than a timed quarantine window.
            </div>
          )}
        </motion.div>
      )}

      {/* Self-Panic Button */}
      <motion.div
        className="bg-gradient-to-br from-red-900/10 to-orange-900/10 border-2 border-red-500/20 rounded-xl p-6"
      >
        <div className="flex items-start gap-4 mb-4">
          <Zap className="w-8 h-8 text-orange-400" />
          <div className="flex-1">
            <div className="font-bold text-xl mb-2">Emergency Self-Panic</div>
            <p className="text-sm text-gray-400 mb-4">
              {supportsDuration
                ? 'Suspect your keys are compromised? Lock your vault immediately for up to 30 days. Can only be used once per 24 hours.'
                : 'Suspect your keys are compromised? Pause your vault immediately. It stays paused until a follow-up unpause transaction is executed.'}
            </p>
            
            {!canPanic && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 mb-4">
                <div className="text-orange-400 text-sm font-medium">
                  {cooldownHours > 0 || cooldownMinutes > 0 
                    ? `⏳ Cooldown: ${cooldownHours}h ${cooldownMinutes}m remaining`
                    : `⏳ Vault age: ${ageMinutes}m (need 60m minimum)`
                  }
                </div>
              </div>
            )}
            
            {showPanicConfirm ? (
              <div className="space-y-3">
                {supportsDuration ? (
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Lock Duration (hours)</label>
                    <input
                      type="range"
                      min="1"
                      max="720"
                      value={panicDuration}
                      onChange={(e) =>  setPanicDuration(safeParseInt(e.target.value, 24, { min: 1, max: 720 }))}
                      className="w-full"
                    />
                    <div className="text-center text-white font-bold mt-2">
                      {panicDuration} hours ({Math.floor(panicDuration / 24)} days)
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-300">
                    This action pauses the vault immediately and does not expire on its own.
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleSelfPanic}
                    disabled={isPanicking}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {isPanicking ? 'Locking...' : 'CONFIRM PANIC LOCK'}
                  </button>
                  <button
                    onClick={() => setShowPanicConfirm(false)}
                    className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPanicConfirm(true)}
                disabled={!canPanic || isPanicking}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all"
              >
                {isPanicking ? 'Activating...' : canPanic ? 'ACTIVATE SELF-PANIC' : 'SELF-PANIC LOCKED'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-green-900/20 border-2 border-green-500 rounded-xl p-4 text-center"
          >
            <div className="text-green-400 font-bold">✅ Vault Locked Successfully</div>
            <div className="text-sm text-gray-400 mt-1">{supportsDuration ? 'Your vault is now in quarantine' : 'Your vault is now paused'}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Footer */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span><strong>Protection Model:</strong> {supportsDuration ? 'Emergency Breaker → Guardian Lock → Quarantine → Global Risk' : 'Guardian governance → direct vault pause → guarded recovery flows'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3" />
            <span><strong>Guardian Lock:</strong> Requires {guardians.threshold} of {guardians.guardianCount} guardians to protect the vault</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span><strong>{supportsDuration ? 'Quarantine' : 'Pause'}:</strong> {supportsDuration ? 'Time-based lock with automatic expiry' : 'Manual pause with explicit unpause recovery'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
