'use client'

import { CURRENT_CHAIN_ID } from '@/lib/testnet'
import { IS_TESTNET, getSupportedChainFromId as _getSupportedChainFromId } from '@/lib/chains'
import { base, baseSepolia } from 'wagmi/chains'
import { safeLocalStorage } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Check, Loader2, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { logger } from '@/lib/logger'

/**
 * Seamless Network Switch Overlay
 * 
 * Shows a clear overlay when user is on wrong network.
 * Simplified UX:
 * - One primary "Switch Network" button (uses wagmi)
 * - Clear error messages with next steps
 * - Auto-dismisses on success
 * - Can be dismissed manually
 * - Remembers preference for auto-switch
 */
export function NetworkSwitchOverlay() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending, isError, isSuccess, error } = useSwitchChain()
  const [dismissed, setDismissed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const expectedChainId = CURRENT_CHAIN_ID
  const expectedChain = IS_TESTNET ? baseSepolia : base
  const isWrongNetwork = isConnected && chainId !== expectedChainId

  // Check if user prefers auto-switch
  const AUTO_SWITCH_KEY = 'vfide-auto-switch-network'

  useEffect(() => {
    const autoSwitch = safeLocalStorage.getItem(AUTO_SWITCH_KEY) === 'true'
    if (autoSwitch && isWrongNetwork && !isPending && !dismissed) {
      handleSwitch(true)
    }
     
  }, [isWrongNetwork])

  // Show success animation briefly
  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setDismissed(true)
      }, 1500)
    }
  }, [isSuccess])

  // Reset dismissed state when address changes (new wallet)
  useEffect(() => {
    setDismissed(false)
  }, [address])

  // Reset when user manually switches to correct network
  useEffect(() => {
    if (!isWrongNetwork) {
      setDismissed(false)
    }
  }, [isWrongNetwork])

  const handleSwitch = useCallback(async (remember: boolean = false) => {
    if (remember) {
      safeLocalStorage.setItem(AUTO_SWITCH_KEY, 'true')
    }

    try {
      switchChain({ chainId: expectedChainId as 84532 | 8453 })
    } catch (e) {
      logger.error('Network switch failed', e, { 
        expectedChainId, 
        currentChainId: chainId 
      })
    }
  }, [switchChain, expectedChainId, chainId])

  const handleDismiss = () => {
    setDismissed(true)
    safeLocalStorage.removeItem(AUTO_SWITCH_KEY)
  }
  
  // Get user-friendly error message
  const getErrorMessage = () => {
    if (!error) return null
    
    const message = error.message.toLowerCase()
    
    if (message.includes('rejected') || message.includes('denied')) {
      return 'Network switch cancelled. Click "Switch Network" to try again.'
    }
    
    if (message.includes('not found') || message.includes('unknown chain')) {
      return `${expectedChain.name} not found in your wallet. Add it in wallet settings, then retry.`
    }
    
    if (message.includes('user') || message.includes('cancelled')) {
      return 'You cancelled the switch. Click "Switch Network" when ready.'
    }
    
    return 'Switch failed. Try manually switching in your wallet, or disconnect and reconnect.'
  }

  const shouldShow = isWrongNetwork && !dismissed

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          {/* Success State */}
          {showSuccess ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Connected!</h2>
              <p className="text-gray-400">You&apos;re now on {expectedChain.name}</p>
            </motion.div>
          ) : (
            /* Main Switch Card */
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-md w-full mx-4 bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden"
            >
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with animation */}
              <div className="pt-8 pb-4 px-6 text-center">
                <motion.div
                  animate={{ 
                    y: [0, -5, 0],
                    rotate: [0, -5, 5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center"
                >
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-1">Wrong Network</h2>
                <p className="text-gray-400 text-sm">
                  VFIDE runs on {expectedChain.name}
                </p>
              </div>

              {/* Network Switch Visual */}
              <div className="px-6 py-4 flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                    <span className="text-xl">❌</span>
                  </div>
                  <span className="text-xs text-gray-500">Current</span>
                </div>

                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6 text-cyan-500" />
                </motion.div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                    <span className="text-xl">🔵</span>
                  </div>
                  <span className="text-xs text-gray-400">{expectedChain.name}</span>
                </div>
              </div>

              {/* Error Message with actionable guidance */}
              {isError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <p className="text-red-400 text-sm text-center">
                    {getErrorMessage()}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="px-6 pb-6 space-y-3">
                {/* Primary: One-Click Switch */}
                <button
                  onClick={() => handleSwitch(false)}
                  disabled={isPending}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Switch to {expectedChain.name}
                    </>
                  )}
                </button>

                {/* Auto-switch checkbox */}
                <label className="flex items-center justify-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSwitch(true)
                      } else {
                        safeLocalStorage.removeItem(AUTO_SWITCH_KEY)
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  Switch automatically next time
                </label>

                {/* Skip for now */}
                <button
                  onClick={handleDismiss}
                  className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  I&apos;ll switch later
                </button>
              </div>

              {/* Bottom help text with setup guide link */}
              <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800">
                <p className="text-xs text-gray-500 text-center">
                  💡 Need help? Check your wallet extension or{' '}
                  <a 
                    href={IS_TESTNET ? 'https://docs.base.org/using-base#step-2-switch-to-base-sepolia-testnet' : 'https://docs.base.org/using-base'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    view setup guide
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
