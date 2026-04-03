'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi'
import { 
  Wallet, Globe, Droplets, CheckCircle, ArrowRight, X, 
  ExternalLink, Copy, Check, Loader2, AlertCircle, Sparkles
} from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { CURRENT_CHAIN_ID, FAUCET_URLS } from '@/lib/testnet'
import { getChainByChainId } from '@/lib/chains'
import { safeParseFloat } from '@/lib/validation'
import { getEthereumProvider, getProviderErrorCode, requestEthereum } from '@/lib/ethereumProvider'
import { safeLocalStorage } from '@/lib/utils'
import { formatUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'

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

type Step = 'wallet' | 'network' | 'faucet' | 'complete'

interface SetupWizardProps {
  onComplete?: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  type SwitchChainId = Parameters<typeof switchChain>[0]['chainId']
  const { data: balance } = useBalance({ address })
  
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('wallet')
  const [copied, setCopied] = useState(false)
  const [isAddingNetwork, setIsAddingNetwork] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [hasSeenWizard, setHasSeenWizard] = useState(false)

  const isCorrectNetwork = chainId === CURRENT_CHAIN_ID
  const hasBalance = balance && safeParseFloat(formatUnits(balance.value, balance.decimals), 0) > 0.001

  // Check if user needs the wizard
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const seen = safeLocalStorage.getItem('vfide-setup-complete')
    setHasSeenWizard(!!seen)
    
    // Don't auto-show wizard - let user open it manually if needed
  }, [isConnected])

  // Auto-advance steps based on state
  useEffect(() => {
    if (isConnected && currentStep === 'wallet') {
      setCurrentStep('network')
    }
    if (isConnected && isCorrectNetwork && currentStep === 'network') {
      setCurrentStep('faucet')
    }
    if (isConnected && isCorrectNetwork && hasBalance && currentStep === 'faucet') {
      setCurrentStep('complete')
    }
  }, [isConnected, isCorrectNetwork, hasBalance, currentStep])

  const handleComplete = () => {
    safeLocalStorage.setItem('vfide-setup-complete', 'true')
    setIsOpen(false)
    onComplete?.()
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const addNetworkToWallet = useCallback(async () => {
    setIsAddingNetwork(true)
    setNetworkError(null)
    
    try {
      const ethereum = getEthereumProvider()
      if (!ethereum) {
        setNetworkError('No wallet detected. Please install MetaMask.')
        return
      }

      // Try to switch first
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

      // Add the network
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
      // If switch fails, try adding
      await addNetworkToWallet()
    }
  }

  const steps = [
    { id: 'wallet', label: 'Connect', icon: Wallet, complete: isConnected },
    { id: 'network', label: 'Network', icon: Globe, complete: isConnected && isCorrectNetwork },
    { id: 'faucet', label: 'Get ETH', icon: Droplets, complete: isConnected && isCorrectNetwork && hasBalance },
    { id: 'complete', label: 'Ready!', icon: Sparkles, complete: false },
  ]

  return (
    <>
      {/* Floating "Setup" button for users who dismissed */}
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

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />

            {/* Wizard Modal */}
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
                  <p className="text-sm text-zinc-400">3 quick steps to start testing</p>
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
                  {steps.map((step, idx) => {
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
                        {idx < steps.length - 1 && (
                          <div className={`absolute h-0.5 w-12 mt-5 ml-20 ${isComplete ? 'bg-green-500' : 'bg-zinc-700'}`} />
                        )}
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
                      <h3 className="text-2xl font-bold text-white mb-2">Connect to Supported Network</h3>
                      <p className="text-zinc-400">
                        Switch to {NETWORK_CONFIG.chainName}
                      </p>
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
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          {isAddingNetwork ? 'Adding Network...' : 'Switching...'}
                        </>
                      ) : (
                        <>
                          <Globe size={20} />
                          Switch to {NETWORK_CONFIG.chainName}
                        </>
                      )}
                    </button>

                    <button
                      onClick={addNetworkToWallet}
                      disabled={isAddingNetwork}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Or: Add Network Manually
                    </button>

                    {/* Manual config - always visible */}
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm font-medium text-zinc-300 mb-3">Manual Setup (if buttons don&apos;t work):</p>
                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Network:</span>
                          <span className="text-zinc-300">{NETWORK_CONFIG.chainName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">RPC:</span>
                          <span className="text-cyan-400 text-xs">{NETWORK_CONFIG.rpcUrls[0]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Chain ID:</span>
                          <span className="text-zinc-300">{targetNetwork.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Symbol:</span>
                          <span className="text-zinc-300">{NETWORK_CONFIG.nativeCurrency.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Explorer:</span>
                          <span className="text-cyan-400 text-xs">{NETWORK_CONFIG.blockExplorerUrls[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Get Test ETH */}
                {currentStep === 'faucet' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Droplets size={40} className="text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Get Free Test ETH</h3>
                      <p className="text-zinc-400">
                        You need ETH to pay for transactions (it&apos;s free!)
                      </p>
                    </div>

                    {/* Current balance */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-zinc-500">Your Balance</p>
                      <p className={`text-2xl font-bold ${hasBalance ? 'text-green-400' : 'text-amber-400'}`}>
                        {balance ? safeParseFloat(formatUnits(balance.value, balance.decimals), 0).toFixed(4) : '0.0000'} ETH
                      </p>
                      {hasBalance && (
                        <p className="text-sm text-green-400 mt-1">✓ You&apos;re ready to go!</p>
                      )}
                    </div>

                    {/* Copy address */}
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 mb-1">Your wallet address (copy this for faucets):</p>
                      <button
                        onClick={copyAddress}
                        className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-700 px-3 py-2 rounded text-sm font-mono text-zinc-300 transition-colors"
                      >
                        <span className="truncate">{address}</span>
                        {copied ? <Check size={16} className="text-green-400 ml-2" /> : <Copy size={16} className="ml-2" />}
                      </button>
                    </div>

                    {/* Faucet links */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-zinc-300">Click a faucet to get ETH:</p>
                      
                      <a
                        href={FAUCET_URLS.coinbase}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-lg font-medium text-white transition-colors"
                      >
                        <span>🏆 Coinbase Faucet (Recommended)</span>
                        <ExternalLink size={16} />
                      </a>
                      
                      <a
                        href={FAUCET_URLS.alchemy}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium text-white transition-colors"
                      >
                        <span>⚗️ Alchemy Faucet</span>
                        <ExternalLink size={16} />
                      </a>

                      <a
                        href={FAUCET_URLS.quicknode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium text-white transition-colors"
                      >
                        <span>⚡ QuickNode Faucet</span>
                        <ExternalLink size={16} />
                      </a>
                    </div>

                    <p className="text-xs text-zinc-500 text-center">
                      After requesting ETH, wait ~10 seconds and your balance will update automatically
                    </p>

                    {hasBalance && (
                      <button
                        onClick={() => setCurrentStep('complete')}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                      >
                        Continue <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                )}

                {/* Step 4: Complete */}
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
                      <h3 className="text-2xl font-bold text-white mb-2">You&apos;re All Set! 🎉</h3>
                      <p className="text-zinc-400">
                        Your wallet is connected to {NETWORK_CONFIG.chainName} with test ETH
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-4 text-left">
                      <p className="font-medium text-zinc-300 mb-3">What you can do now:</p>
                      <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Explore the dashboard and features
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Set up your personal vault
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Buy test VFIDE tokens
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          Try the merchant tools
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
