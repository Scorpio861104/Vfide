'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi'
import { IS_TESTNET, FAUCET_URLS, CURRENT_CHAIN_ID } from '@/lib/testnet'
import { GlobalNav } from '@/components/layout/GlobalNav'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { 
  Wallet, Globe, Droplets, CheckCircle, Copy, Check, 
  ExternalLink, Loader2, AlertCircle, ArrowRight 
} from 'lucide-react'

// Base Sepolia network configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: '0x14A34',
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org'],
}

export default function TestnetPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [isAddingNetwork, setIsAddingNetwork] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { data: balance, refetch: refetchBalance } = useBalance({ address })

  const isCorrectNetwork = chainId === CURRENT_CHAIN_ID
  const hasBalance = balance && parseFloat(balance.formatted) > 0.001
  const ethBalance = balance ? parseFloat(balance.formatted) : 0

  // Redirect to home if not testnet mode
  useEffect(() => {
    if (!IS_TESTNET) {
      router.push('/')
    }
  }, [router])

  // Auto-refresh balance every 5 seconds when on faucet step
  useEffect(() => {
    if (isConnected && isCorrectNetwork && !hasBalance) {
      const interval = setInterval(() => {
        refetchBalance()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isConnected, isCorrectNetwork, hasBalance, refetchBalance])

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
      interface EthereumProvider {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      }
      
      const ethereum = (window as { ethereum?: EthereumProvider }).ethereum
      if (!ethereum) {
        setNetworkError('No wallet detected. Install MetaMask first.')
        return
      }

      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA_CONFIG.chainId }],
        })
        return
      } catch (switchError) {
        if ((switchError as { code?: number }).code !== 4902) {
          throw switchError
        }
      }

      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [BASE_SEPOLIA_CONFIG],
      })
    } catch (err) {
      const error = err as { code?: number; message?: string }
      if (error.code === 4001) {
        setNetworkError('Cancelled. Try again when ready.')
      } else {
        setNetworkError('Failed. Add network manually (see below).')
      }
    } finally {
      setIsAddingNetwork(false)
    }
  }, [])

  const handleSwitchNetwork = async () => {
    setNetworkError(null)
    try {
      switchChain({ chainId: CURRENT_CHAIN_ID as 84532 })
    } catch {
      await addNetworkToWallet()
    }
  }

  // Determine current step
  const getStep = () => {
    if (!isConnected) return 1
    if (!isCorrectNetwork) return 2
    if (!hasBalance) return 3
    return 4
  }
  const currentStep = getStep()

  return (
    <>
      <GlobalNav />
      <div className="min-h-screen bg-[#0F0F12] text-white pt-20">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-2">Testnet Setup</h1>
          <p className="text-zinc-400 mb-8">
            Follow these 3 steps to start testing VFIDE
          </p>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-8 px-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                  ${currentStep > step 
                    ? 'bg-green-500 text-white' 
                    : currentStep === step 
                      ? 'bg-cyan-500 text-white animate-pulse' 
                      : 'bg-zinc-800 text-zinc-500'}
                `}>
                  {currentStep > step ? <CheckCircle size={20} /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-20 md:w-32 h-1 mx-2 ${currentStep > step ? 'bg-green-500' : 'bg-zinc-800'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Connect Wallet */}
          <div className={`mb-6 p-6 rounded-xl border ${currentStep === 1 ? 'border-cyan-500 bg-cyan-500/5' : currentStep > 1 ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${currentStep > 1 ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {currentStep > 1 ? <CheckCircle size={24} /> : <Wallet size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Step 1: Connect Wallet</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {currentStep > 1 ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Use MetaMask, Coinbase Wallet, or any Web3 wallet'}
                </p>
                
                {currentStep === 1 && (
                  <div className="space-y-3">
                    <ConnectButton />
                    <p className="text-xs text-zinc-500">
                      No wallet? <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Get MetaMask</a> or <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Coinbase Wallet</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Switch Network */}
          <div className={`mb-6 p-6 rounded-xl border ${currentStep === 2 ? 'border-cyan-500 bg-cyan-500/5' : currentStep > 2 ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${currentStep > 2 ? 'bg-green-500/20 text-green-400' : currentStep === 2 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {currentStep > 2 ? <CheckCircle size={24} /> : <Globe size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Step 2: Switch to Base Sepolia</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {currentStep > 2 ? 'Connected to Base Sepolia ✓' : 'VFIDE runs on the Base Sepolia testnet'}
                </p>
                
                {currentStep === 2 && (
                  <div className="space-y-3">
                    {networkError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {networkError}
                      </div>
                    )}
                    
                    <button
                      onClick={handleSwitchNetwork}
                      disabled={isSwitching || isAddingNetwork}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-zinc-600 disabled:to-zinc-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isSwitching || isAddingNetwork ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          {isAddingNetwork ? 'Adding...' : 'Switching...'}
                        </>
                      ) : (
                        <>
                          <Globe size={18} />
                          Switch to Base Sepolia
                        </>
                      )}
                    </button>

                    <details className="bg-zinc-800 rounded-lg">
                      <summary className="p-3 cursor-pointer text-zinc-400 hover:text-zinc-300 text-sm">
                        Button not working? Add network manually ↓
                      </summary>
                      <div className="px-4 pb-4 pt-2 space-y-2 text-sm border-t border-zinc-700">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Network Name</span>
                          <span className="text-zinc-300 font-mono">Base Sepolia</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">RPC URL</span>
                          <span className="text-cyan-400 font-mono text-xs">https://sepolia.base.org</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Chain ID</span>
                          <span className="text-zinc-300 font-mono">84532</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Symbol</span>
                          <span className="text-zinc-300 font-mono">ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Explorer</span>
                          <span className="text-cyan-400 font-mono text-xs">https://sepolia.basescan.org</span>
                        </div>
                        <p className="text-xs text-zinc-500 pt-2">
                          In MetaMask: Settings → Networks → Add Network → Add Manually
                        </p>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Get Test ETH */}
          <div className={`mb-6 p-6 rounded-xl border ${currentStep === 3 ? 'border-cyan-500 bg-cyan-500/5' : currentStep > 3 ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${currentStep > 3 ? 'bg-green-500/20 text-green-400' : currentStep === 3 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {currentStep > 3 ? <CheckCircle size={24} /> : <Droplets size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Step 3: Get Free Test ETH</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {currentStep > 3 ? `Balance: ${ethBalance.toFixed(4)} ETH ✓` : 'You need ETH to pay for transactions (it\'s free!)'}
                </p>
                
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* Balance display */}
                    <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Your Balance:</span>
                      <span className={`font-bold ${ethBalance > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                        {ethBalance.toFixed(4)} ETH
                      </span>
                    </div>

                    {/* Copy address */}
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 mb-1">1. Copy your wallet address:</p>
                      <button
                        onClick={copyAddress}
                        className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-700 px-3 py-2 rounded text-sm font-mono text-zinc-300 transition-colors"
                      >
                        <span className="truncate">{address}</span>
                        {copied ? <Check size={16} className="text-green-400 ml-2 flex-shrink-0" /> : <Copy size={16} className="ml-2 flex-shrink-0" />}
                      </button>
                    </div>

                    {/* Faucets */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">2. Get ETH from a faucet (paste your address):</p>
                      <div className="space-y-2">
                        <a
                          href={FAUCET_URLS.coinbase}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                          <span>🏆 Coinbase Faucet (Recommended)</span>
                          <ExternalLink size={16} />
                        </a>
                        <a
                          href={FAUCET_URLS.alchemy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                          <span>⚗️ Alchemy Faucet</span>
                          <ExternalLink size={16} />
                        </a>
                        <a
                          href={FAUCET_URLS.quicknode}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                          <span>⚡ QuickNode Faucet</span>
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 text-center">
                      ⏳ After requesting ETH, wait 10-30 seconds. Balance updates automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success / Ready state */}
          {currentStep > 3 && (
            <div className="p-6 rounded-xl border border-green-500 bg-green-500/10 text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">You&apos;re All Set! 🎉</h3>
              <p className="text-zinc-400 mb-6">
                Wallet connected • Base Sepolia • {ethBalance.toFixed(4)} ETH
              </p>
              <Link 
                href="/token-launch"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Start Using VFIDE <ArrowRight size={18} />
              </Link>
            </div>
          )}

          {currentStep <= 3 && (
            <div className="mt-8 text-center">
              <Link href="/" className="text-zinc-500 hover:text-zinc-300">
                ← Back to home
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
