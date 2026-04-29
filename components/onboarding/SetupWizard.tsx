'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { 
  Wallet, Globe, Droplets, CheckCircle, ArrowRight, X, 
  Loader2, AlertCircle, Sparkles, Shield, Users
} from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { CURRENT_CHAIN_ID } from '@/lib/testnet'
import { getChainByChainId, isTestnetChainId } from '@/lib/chains'
import { getEthereumProvider, getProviderErrorCode, requestEthereum } from '@/lib/ethereumProvider'
import { safeLocalStorage } from '@/lib/utils'
import { baseSepolia } from 'wagmi/chains'
import { GuardianWizard } from './GuardianWizard'

const targetChainConfig = typeof getChainByChainId === 'function'
  ? getChainByChainId(CURRENT_CHAIN_ID)
  : undefined
const targetNetwork = targetChainConfig
  ? (targetChainConfig.mainnet.id === CURRENT_CHAIN_ID ? targetChainConfig.mainnet : targetChainConfig.testnet)
  : baseSepolia

const NETWORK_CONFIG = {
  chainId: `0x${targetNetwork.id.toString(16).toUpperCase()}`,
  chainName: targetNetwork.name || 'Base Sepolia',
  nativeCurrency: targetNetwork.nativeCurrency || {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [targetNetwork.rpcUrls?.default?.http?.[0] || 'https://sepolia.base.org'],
  blockExplorerUrls: [targetNetwork.blockExplorers?.default?.url || 'https://sepolia.basescan.org'],
}

const TARGET_IS_TESTNET = isTestnetChainId(CURRENT_CHAIN_ID)

type Step = 'wallet' | 'network' | 'tokens' | 'guardians' | 'complete'

interface SetupWizardProps {
  onComplete?: () => void
  referrer?: string | null
}

export function SetupWizard({ onComplete, referrer }: SetupWizardProps) {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  type SwitchChainId = Parameters<typeof switchChain>[0]['chainId']
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('wallet')
  const [isAddingNetwork, setIsAddingNetwork] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [hasSeenWizard, setHasSeenWizard] = useState(false)
  
  // Token claim state
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)

  // Guardian state
  const [guardiansComplete, setGuardiansComplete] = useState(false)
  const [showGuardianWizard, setShowGuardianWizard] = useState(false)

  const isCorrectNetwork = chainId === CURRENT_CHAIN_ID

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = safeLocalStorage.getItem('vfide-setup-complete')
    setHasSeenWizard(!!seen)
  }, [isConnected])

  // Auto-advance steps
  useEffect(() => {
    if (isConnected && currentStep === 'wallet') {
      setCurrentStep('network')
    }
    if (isConnected && isCorrectNetwork && currentStep === 'network') {
      setCurrentStep(TARGET_IS_TESTNET ? 'tokens' : 'guardians')
    }
  }, [isConnected, isCorrectNetwork, currentStep])

  const handleComplete = () => {
    safeLocalStorage.setItem('vfide-setup-complete', 'true')
    setIsOpen(false)
    onComplete?.()
  }

  // Auto-claim tokens via faucet API
  const claimTokens = useCallback(async () => {
    if (!TARGET_IS_TESTNET) {
      setClaimError('Token claiming is only available on testnet.')
      return
    }
    if (!address || isClaiming) return
    setIsClaiming(true)
    setClaimError(null)

    try {
      // Read referrer from URL if not passed as prop
      const ref = referrer || new URLSearchParams(window.location.search).get('ref')
      
      const res = await fetch('/api/faucet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, referrer: ref || undefined }),
      })
      const data = await res.json()

      if (res.status === 409) {
        setAlreadyClaimed(true)
        setClaimSuccess(true)
        return
      }
      if (!res.ok) {
        setClaimError(data.error || 'Claim failed. Try again.')
        return
      }

      setClaimSuccess(true)
    } catch {
      setClaimError('Network error. Please try again.')
    } finally {
      setIsClaiming(false)
    }
  }, [address, isClaiming, referrer])

  const addNetworkToWallet = useCallback(async () => {
    setIsAddingNetwork(true)
    setNetworkError(null)
    
    try {
      const ethereum = getEthereumProvider()
      if (!ethereum) {
        setNetworkError('No wallet detected. Please install MetaMask.')
        return
      }

      try {
        await requestEthereum(ethereum, {
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainId }],
        }, () => undefined)
        return
      } catch (switchError) {
        if (getProviderErrorCode(switchError) !== 4902) {
          throw switchError
        }
      }

      await requestEthereum(ethereum, {
        method: 'wallet_addEthereumChain',
        params: [NETWORK_CONFIG],
      }, () => undefined)
    } catch (err) {
      const error = err as { code?: number; message?: string }
      if (getProviderErrorCode(error) === 4001) {
        setNetworkError('Request cancelled. Try again when ready.')
      } else {
        setNetworkError('Failed to add network. Try manually.')
      }
    } finally {
      setIsAddingNetwork(false)
    }
  }, [])

  const handleSwitchNetwork = async () => {
    setNetworkError(null)
    try {
      switchChain({ chainId: CURRENT_CHAIN_ID as SwitchChainId })
    } catch {
      await addNetworkToWallet()
    }
  }

  const steps = [
    { id: 'wallet', label: 'Connect', icon: Wallet, complete: isConnected },
    { id: 'network', label: 'Network', icon: Globe, complete: isConnected && isCorrectNetwork },
    ...(TARGET_IS_TESTNET ? [{ id: 'tokens', label: 'Tokens', icon: Droplets, complete: claimSuccess || alreadyClaimed }] : []),
    { id: 'guardians', label: 'Protect', icon: Shield, complete: guardiansComplete },
    { id: 'complete', label: 'Ready!', icon: Sparkles, complete: false },
  ]

  return (
    <>
      {!isOpen && !hasSeenWizard && (
        <motion.button
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-24 md:bottom-6 left-6 z-40 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <AlertCircle size={20} />
          <span>Setup Required</span>
        </motion.button>
      )}

      {/* Guardian Wizard modal (shown over SetupWizard) */}
      {showGuardianWizard && (
        <GuardianWizard
          onClose={() => {
            setShowGuardianWizard(false)
          }}
          onComplete={() => {
            setGuardiansComplete(true)
            setCurrentStep('complete')
          }}
        />
      )}

      <AnimatePresence>
        {isOpen && !showGuardianWizard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full z-[101] bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Get Started with VFIDE</h2>
                  <p className="text-sm text-zinc-400">{steps.length - 1} steps to your protected account</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="px-6 py-4 border-b border-zinc-800">
                <div className="flex justify-between">
                  {steps.map((step) => {
                    const StepIcon = step.icon
                    const isActive = step.id === currentStep
                    const isComplete = step.complete
                    
                    return (
                      <div key={step.id} className="flex flex-col items-center flex-1">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all
                          ${isComplete 
                            ? 'bg-green-500 text-white' 
                            : isActive 
                              ? 'bg-cyan-500 text-white animate-pulse' 
                              : 'bg-zinc-800 text-zinc-500'}
                        `}>
                          {isComplete ? <CheckCircle size={20} /> : <StepIcon size={20} />}
                        </div>
                        <span className={`text-xs ${isActive || isComplete ? 'text-white' : 'text-zinc-500'}`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Step 1: Connect Wallet */}
                {currentStep === 'wallet' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Wallet size={40} className="text-cyan-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                      <p className="text-zinc-400">
                        Use MetaMask, Coinbase Wallet, or any Web3 wallet
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <ConnectButton />
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400">
                      <p className="font-medium text-zinc-300 mb-2">Don&apos;t have a wallet?</p>
                      <ul className="space-y-1">
                        <li>• <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Download MetaMask</a> (browser extension)</li>
                        <li>• <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Get Coinbase Wallet</a> (mobile app)</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Step 2: Switch Network */}
                {currentStep === 'network' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Globe size={40} className="text-blue-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Connect to {NETWORK_CONFIG.chainName}</h3>
                      <p className="text-zinc-400">One tap to switch networks</p>
                    </div>

                    {networkError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                        {networkError}
                      </div>
                    )}

                    <button
                      onClick={handleSwitchNetwork}
                      disabled={isSwitching || isAddingNetwork}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-zinc-600 disabled:to-zinc-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isSwitching || isAddingNetwork ? (
                        <><Loader2 size={20} className="animate-spin" /> Switching...</>
                      ) : (
                        <><Globe size={20} /> Switch to {NETWORK_CONFIG.chainName}</>
                      )}
                    </button>
                  </div>
                )}

                {/* Step 3: Claim Tokens (auto via faucet) */}
                {currentStep === 'tokens' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Droplets size={40} className="text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Get Your Test Tokens</h3>
                      <p className="text-zinc-400">
                        Free VFIDE tokens + gas to start testing
                      </p>
                    </div>

                    {claimSuccess ? (
                      <div className="space-y-4">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                          <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                          <p className="text-green-400 font-bold">
                            {alreadyClaimed ? 'Tokens already in your vault!' : '1,000 VFIDE + gas ETH sent!'}
                          </p>
                          <p className="text-zinc-400 text-sm mt-1">
                            Your vault was created automatically
                          </p>
                        </div>
                        <button
                          onClick={() => setCurrentStep('guardians')}
                          className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                          Continue — Protect Your Account <ArrowRight size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {claimError && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                            {claimError}
                          </div>
                        )}
                        <button
                          onClick={claimTokens}
                          disabled={isClaiming}
                          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-zinc-600 disabled:to-zinc-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          {isClaiming ? (
                            <><Loader2 size={20} className="animate-spin" /> Sending tokens...</>
                          ) : (
                            <><Sparkles size={20} /> Claim 1,000 Free VFIDE</>
                          )}
                        </button>
                        <p className="text-xs text-zinc-500 text-center">
                          Includes gas ETH so you can start transacting immediately
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Guardian Setup (MANDATORY) */}
                {currentStep === 'guardians' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Shield size={40} className="text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Protect Your Account</h3>
                      <p className="text-zinc-400">
                        Add trusted people who can help you recover your vault
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-amber-400 font-bold text-sm mb-2">⚠️ Why this matters</p>
                      <p className="text-zinc-300 text-sm">
                        If you lose your phone or your wallet keys are stolen, guardians are the 
                        <span className="text-white font-bold"> only way </span>
                        to recover your money. Without guardians, lost means lost forever.
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Users size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-zinc-200 text-sm font-medium">Pick people you trust</p>
                          <p className="text-zinc-400 text-xs">Family, close friends, or your other wallets</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-zinc-200 text-sm font-medium">They protect, they can&apos;t spend</p>
                          <p className="text-zinc-400 text-xs">Guardians help you recover access but cannot touch your tokens</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-zinc-200 text-sm font-medium">We recommend at least 2</p>
                          <p className="text-zinc-400 text-xs">More guardians = more safety. You need at least 2.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowGuardianWizard(true)}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Shield size={20} />
                      Set Up Guardians
                    </button>

                    <p className="text-xs text-zinc-500 text-center">
                      This is the most important step. Your guardians are your safety net.
                    </p>
                  </div>
                )}

                {/* Step 5: Complete */}
                {currentStep === 'complete' && (
                  <div className="space-y-6 text-center">
                    <div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10 }}
                        className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
                      >
                        <Sparkles size={48} className="text-green-400" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white mb-2">You&apos;re Protected! 🎉</h3>
                      <p className="text-zinc-400">
                        {TARGET_IS_TESTNET
                          ? 'Your vault is funded, your guardians are set, you\'re ready to go'
                          : 'Your wallet is connected, your guardians are set, you\'re ready to go'}
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-4 text-left">
                      <p className="font-medium text-zinc-300 mb-3">What you can do now:</p>
                      <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Send and receive VFIDE payments
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Register as a merchant
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Build your ProofScore through activity
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Invite friends to earn headhunter rewards
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleComplete}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Start Exploring <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
