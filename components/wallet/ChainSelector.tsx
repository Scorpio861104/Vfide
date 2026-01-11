'use client'

import { CHAINS, type SupportedChain, getChainList, getChainNetwork, isChainReady } from '@/lib/chains'
import { useEffect, useState } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'

interface ChainSelectorProps {
  onChainSelect?: (chain: SupportedChain) => void
  showOnlyReady?: boolean
  compact?: boolean
}

export function ChainSelector({ onChainSelect, showOnlyReady = false, compact = false }: ChainSelectorProps) {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [selectedChain, setSelectedChain] = useState<SupportedChain>('base')
  const [isOpen, setIsOpen] = useState(false)

  // Find current chain from chainId
  useEffect(() => {
    const chains = getChainList()
    for (const chain of chains) {
      // Check both mainnet and testnet for this chain
      if (chain.mainnet.id === chainId || chain.testnet.id === chainId) {
        setSelectedChain(prev => prev !== chain.id ? chain.id : prev)
        break
      }
    }
  }, [chainId])

  const handleSelect = async (chain: SupportedChain) => {
    const network = getChainNetwork(chain)
    
    setSelectedChain(chain)
    setIsOpen(false)
    
    // Switch chain if connected
    if (switchChain) {
      try {
        // Type assertion needed for wagmi's strict chain ID typing
        await switchChain({ chainId: network.id as 84532 | 8453 | 300 | 80002 | 137 | 324 })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to switch chain:', error)
        }
      }
    }
    
    onChainSelect?.(chain)
  }

  const chainList = getChainList().filter(
    chain => !showOnlyReady || isChainReady(chain.id)
  )

  const currentChain = CHAINS[selectedChain]

  // Compact version - just a pill showing current chain
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 transition-all"
        >
          <span className="text-lg">{currentChain.icon}</span>
          <span className="text-sm font-medium text-gray-200">{currentChain.name}</span>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute right-0 top-full mt-2 z-50 bg-gray-900 rounded-xl border border-gray-700 shadow-xl overflow-hidden min-w-50 max-w-[calc(100vw-2rem)]">
              {chainList.map((chain) => {
                const ready = isChainReady(chain.id)
                return (
                  <button
                    key={chain.id}
                    onClick={() => ready && handleSelect(chain.id)}
                    disabled={!ready || isPending}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      selectedChain === chain.id 
                        ? 'bg-blue-600/20 text-white' 
                        : ready 
                          ? 'hover:bg-gray-800 text-gray-200' 
                          : 'opacity-50 cursor-not-allowed text-gray-500'
                    }`}
                  >
                    <span className="text-xl">{chain.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-xs text-gray-400">
                        {ready ? chain.tagline : 'Coming soon'}
                      </div>
                    </div>
                    {selectedChain === chain.id && (
                      <span className="ml-auto text-green-400">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // Full version - card grid for onboarding
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white text-center">
        Choose Your Network
      </h3>
      <p className="text-sm text-gray-400 text-center">
        Pick the network that works best for you. All have the same features!
      </p>

      <div className="grid gap-3">
        {chainList.map((chain) => {
          const ready = isChainReady(chain.id)
          const isSelected = selectedChain === chain.id
          
          return (
            <button
              key={chain.id}
              onClick={() => ready && handleSelect(chain.id)}
              disabled={!ready || isPending}
              className={`
                relative w-full p-4 rounded-xl border-2 transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : ready 
                    ? 'border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800' 
                    : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                }
              `}
            >
              {/* Recommended badge for Base */}
              {chain.id === 'base' && ready && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                  EASIEST
                </span>
              )}
              
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${chain.color}20` }}
                >
                  {chain.icon}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{chain.name}</span>
                    {isSelected && (
                      <span className="text-green-400">✓</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{chain.description}</p>
                </div>

                {!ready && (
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Features */}
              {ready && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex flex-wrap gap-2">
                  {chain.id === 'base' && (
                    <>
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                        Coinbase Ready
                      </span>
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                        No Setup
                      </span>
                    </>
                  )}
                  {chain.id === 'polygon' && (
                    <>
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        50M+ Wallets
                      </span>
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                        Fast Txns
                      </span>
                    </>
                  )}
                  {chain.id === 'zksync' && (
                    <>
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                        Lowest Fees
                      </span>
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                        ZK Proofs
                      </span>
                    </>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isPending && (
        <div className="text-center text-sm text-blue-400">
          <span className="inline-block animate-spin mr-2">⏳</span>
          Switching network...
        </div>
      )}
    </div>
  )
}

export default ChainSelector
