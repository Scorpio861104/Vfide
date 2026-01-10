'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { 
  Copy, Check, ExternalLink, AlertTriangle, CheckCircle, ArrowRight, Globe
} from 'lucide-react'
import { useAccount, useChainId, useBalance } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { CURRENT_CHAIN_ID, FAUCET_URLS } from '@/lib/testnet'
import { safeParseFloat } from '@/lib/validation';
import { useCopyWithId } from '@/lib/hooks/useCopyToClipboard';

// Base Sepolia network details - ALWAYS VISIBLE
const NETWORK_CONFIG = {
  name: 'Base Sepolia',
  rpc: 'https://sepolia.base.org',
  chainId: 84532,
  chainIdHex: '0x14A34',
  symbol: 'ETH',
  explorer: 'https://sepolia.basescan.org',
}

export default function SetupPage() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })
  
  const { copiedId: copiedField, copyWithId: copyToClipboard } = useCopyWithId()
  const [addingNetwork, setAddingNetwork] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  const isCorrectNetwork = chainId === CURRENT_CHAIN_ID
  const hasBalance = balance && safeParseFloat(balance.formatted, 0) > 0.001
  const ethBalance = balance ? safeParseFloat(balance.formatted, 0) : 0

  // Direct MetaMask add network
  const addToMetaMask = useCallback(async () => {
    setAddingNetwork(true)
    setAddError(null)
    setAddSuccess(false)

    interface EthereumProvider {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }

    try {
      // Check if MetaMask is available
      const ethereum = (window as { ethereum?: EthereumProvider }).ethereum
      if (!ethereum) {
        setAddError('MetaMask not detected. Please install MetaMask first.')
        setAddingNetwork(false)
        return
      }

      // First try to switch (in case already added)
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
        })
        setAddSuccess(true)
        setAddingNetwork(false)
        return
      } catch (switchError) {
        // 4902 = chain not added yet, continue to add
        if ((switchError as { code?: number }).code !== 4902) {
          throw switchError
        }
      }

      // Add the network
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: NETWORK_CONFIG.chainIdHex,
          chainName: NETWORK_CONFIG.name,
          nativeCurrency: {
            name: 'Sepolia Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: [NETWORK_CONFIG.rpc],
          blockExplorerUrls: [NETWORK_CONFIG.explorer],
        }],
      })
      
      setAddSuccess(true)
    } catch (err) {
      const error = err as { code?: number; message?: string }
      console.error('Add network error:', error)
      if (error.code === 4001) {
        setAddError('You rejected the request. Click the button again when ready.')
      } else {
        setAddError(error.message || 'Failed to add network. Try adding manually below.')
      }
    } finally {
      setAddingNetwork(false)
    }
  }, [])

  // Status checks
  const step1Done = isConnected
  const step2Done = isConnected && isCorrectNetwork
  const step3Done = isConnected && isCorrectNetwork && hasBalance

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-cyan-400">VFIDE</Link>
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← Back to app</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Testnet Setup Guide</h1>
        <p className="text-zinc-400 mb-8">
          Complete these 3 steps to start using VFIDE on Base Sepolia testnet
        </p>

        {/* Overall Status */}
        {step3Done && (
          <div className="mb-8 p-6 bg-green-500/10 border border-green-500 rounded-xl text-center">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-400 mb-2">You&apos;re All Set! 🎉</h2>
            <p className="text-zinc-300 mb-4">Connected to Base Sepolia with {ethBalance.toFixed(4)} ETH</p>
            <Link 
              href="/token-launch"
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg"
            >
              Start Using VFIDE <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {/* ============ STEP 1: CONNECT WALLET ============ */}
        <div className={`mb-6 p-6 rounded-xl border-2 ${step1Done ? 'border-green-500 bg-green-500/5' : 'border-cyan-500 bg-cyan-500/5'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step1Done ? 'bg-green-500 text-white' : 'bg-cyan-500 text-white'}`}>
              {step1Done ? <CheckCircle size={20} /> : '1'}
            </div>
            <h2 className="text-xl font-bold">Connect Your Wallet</h2>
          </div>
          
          {step1Done ? (
            <p className="text-green-400 ml-13">
              ✓ Connected: {address?.slice(0, 8)}...{address?.slice(-6)}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-400">
                Use MetaMask, Coinbase Wallet, or any Web3 wallet to connect.
              </p>
              <ConnectButton />
              <p className="text-sm text-zinc-500">
                Don&apos;t have a wallet?{' '}
                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  Download MetaMask
                </a>
              </p>
            </div>
          )}
        </div>

        {/* ============ STEP 2: ADD BASE SEPOLIA NETWORK ============ */}
        <div className={`mb-6 p-6 rounded-xl border-2 ${step2Done ? 'border-green-500 bg-green-500/5' : step1Done ? 'border-cyan-500 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step2Done ? 'bg-green-500 text-white' : step1Done ? 'bg-cyan-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
              {step2Done ? <CheckCircle size={20} /> : '2'}
            </div>
            <h2 className="text-xl font-bold">Add Base Sepolia Network</h2>
          </div>

          {step2Done ? (
            <p className="text-green-400">✓ Connected to Base Sepolia</p>
          ) : (
            <div className="space-y-6">
              {/* One-click add button */}
              <div>
                <button
                  onClick={addToMetaMask}
                  disabled={addingNetwork || !step1Done}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-3"
                >
                  {addingNetwork ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adding Network...
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.37 4.73L13.16.25a2.39 2.39 0 00-2.32 0L2.63 4.73A2.34 2.34 0 001.5 6.8v10.4a2.34 2.34 0 001.13 2.07l8.21 4.48a2.39 2.39 0 002.32 0l8.21-4.48a2.34 2.34 0 001.13-2.07V6.8a2.34 2.34 0 00-1.13-2.07z"/>
                      </svg>
                      Add Base Sepolia to MetaMask
                    </>
                  )}
                </button>
                
                {addError && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-start gap-2">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    {addError}
                  </div>
                )}
                
                {addSuccess && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle size={18} />
                    Network added! Now switch to it in your wallet.
                  </div>
                )}
              </div>

              {/* MANUAL SETUP - Always visible, not hidden */}
              <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Globe size={18} className="text-cyan-400" />
                  Manual Setup (if button doesn&apos;t work)
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  In MetaMask: Click the network dropdown → &quot;Add network&quot; → &quot;Add a network manually&quot;
                </p>
                
                <div className="space-y-3">
                  {/* Network Name */}
                  <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-zinc-500">Network Name</p>
                      <p className="font-mono text-white">{NETWORK_CONFIG.name}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(NETWORK_CONFIG.name, 'name')}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {copiedField === 'name' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-zinc-400" />}
                    </button>
                  </div>

                  {/* RPC URL */}
                  <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-zinc-500">New RPC URL</p>
                      <p className="font-mono text-cyan-400 text-sm">{NETWORK_CONFIG.rpc}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(NETWORK_CONFIG.rpc, 'rpc')}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {copiedField === 'rpc' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-zinc-400" />}
                    </button>
                  </div>

                  {/* Chain ID */}
                  <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-zinc-500">Chain ID</p>
                      <p className="font-mono text-white">{NETWORK_CONFIG.chainId}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(String(NETWORK_CONFIG.chainId), 'chainId')}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {copiedField === 'chainId' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-zinc-400" />}
                    </button>
                  </div>

                  {/* Currency Symbol */}
                  <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-zinc-500">Currency Symbol</p>
                      <p className="font-mono text-white">{NETWORK_CONFIG.symbol}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(NETWORK_CONFIG.symbol, 'symbol')}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {copiedField === 'symbol' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-zinc-400" />}
                    </button>
                  </div>

                  {/* Block Explorer */}
                  <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-zinc-500">Block Explorer URL</p>
                      <p className="font-mono text-cyan-400 text-sm">{NETWORK_CONFIG.explorer}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(NETWORK_CONFIG.explorer, 'explorer')}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {copiedField === 'explorer' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-zinc-400" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============ STEP 3: GET TEST ETH ============ */}
        <div className={`mb-6 p-6 rounded-xl border-2 ${step3Done ? 'border-green-500 bg-green-500/5' : step2Done ? 'border-cyan-500 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step3Done ? 'bg-green-500 text-white' : step2Done ? 'bg-cyan-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
              {step3Done ? <CheckCircle size={20} /> : '3'}
            </div>
            <h2 className="text-xl font-bold">Get Free Test ETH</h2>
          </div>

          {step3Done ? (
            <p className="text-green-400">✓ Balance: {ethBalance.toFixed(4)} ETH</p>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-400">
                Test ETH is free and used to pay for transaction fees. Get some from a faucet.
              </p>

              {/* Current balance */}
              {step2Done && (
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-500">Your current balance:</p>
                  <p className={`text-2xl font-bold ${ethBalance > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                    {ethBalance.toFixed(4)} ETH
                  </p>
                </div>
              )}

              {/* Copy address */}
              {address && (
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-500 mb-2">Your wallet address (copy for faucet):</p>
                  <button
                    onClick={() => copyToClipboard(address, 'address')}
                    className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-700 p-3 rounded-lg text-sm font-mono text-zinc-300 transition-colors"
                  >
                    <span className="truncate">{address}</span>
                    {copiedField === 'address' ? <Check size={16} className="text-green-400 ml-2 shrink-0" /> : <Copy size={16} className="text-zinc-400 ml-2 shrink-0" />}
                  </button>
                </div>
              )}

              {/* Faucet links */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-300">Open a faucet and paste your address:</p>
                <a
                  href={FAUCET_URLS.coinbase}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-blue-600 hover:bg-blue-500 px-4 py-4 rounded-lg font-medium transition-colors"
                >
                  <span>🏆 Coinbase Faucet (Recommended)</span>
                  <ExternalLink size={18} />
                </a>
                <a
                  href={FAUCET_URLS.alchemy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-4 rounded-lg font-medium transition-colors"
                >
                  <span>⚗️ Alchemy Faucet</span>
                  <ExternalLink size={18} />
                </a>
                <a
                  href={FAUCET_URLS.quicknode}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-4 rounded-lg font-medium transition-colors"
                >
                  <span>⚡ QuickNode Faucet</span>
                  <ExternalLink size={18} />
                </a>
              </div>

              <p className="text-sm text-zinc-500 text-center">
                After requesting, wait 10-30 seconds. Refresh this page to see your balance update.
              </p>
            </div>
          )}
        </div>

        {/* Troubleshooting */}
        <div className="mt-8 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Troubleshooting
          </h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <p><strong className="text-zinc-300">MetaMask not responding?</strong> Try refreshing the page, or disconnect and reconnect your wallet.</p>
            <p><strong className="text-zinc-300">Network button not working?</strong> Use the manual setup above - copy each field one by one into MetaMask.</p>
            <p><strong className="text-zinc-300">Faucet says &quot;already claimed&quot;?</strong> Try a different faucet, or wait 24 hours.</p>
            <p><strong className="text-zinc-300">Still stuck?</strong> <a href="https://discord.gg/vfide" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Join our Discord</a> for help.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
