'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount, useChainId, useBalance, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'
import { IS_TESTNET, FAUCET_URLS } from '@/lib/testnet'

export default function TestnetPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  // Redirect to home if not testnet mode
  useEffect(() => {
    if (!IS_TESTNET) {
      router.push('/')
    }
  }, [router])

  // Wallet state
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData, refetch } = useBalance({ address })
  const { openConnectModal } = useConnectModal()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const BASE_SEPOLIA_CHAIN_ID = baseSepolia.id
  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'
  const isOnCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID
  const hasBalance = parseFloat(ethBalance) >= 0.0001

  // Calculate step
  const step = !isConnected ? 1 : !isOnCorrectChain ? 2 : !hasBalance ? 3 : 4

  // Poll for balance updates on step 3
  useEffect(() => {
    if (step === 3) {
      const interval = setInterval(() => refetch(), 4000)
      return () => clearInterval(interval)
    }
  }, [step, refetch])

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Minimal testnet indicator */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 text-center">
        <span className="text-amber-400 text-sm font-medium">🧪 Testnet Mode — No real funds</span>
      </div>

      {/* Toast notification */}
      {copied && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          ✓ Address copied
        </div>
      )}

      <div className="max-w-md mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Get Started</h1>
          <p className="text-zinc-400">
            {step < 4 ? 'Set up your wallet to try VFIDE' : 'You\'re all set!'}
          </p>
        </div>

        {/* Progress indicator - minimal */}
        <div className="flex items-center justify-center gap-1 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                step > s ? 'w-10 bg-green-500' : step === s ? 'w-10 bg-purple-500' : 'w-10 bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Connect Wallet */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 text-lg">1</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Connect Your Wallet</h2>
                  <p className="text-zinc-400 text-sm">Link a wallet to interact with the testnet</p>
                </div>
              </div>
              
              <button
                onClick={openConnectModal}
                className="w-full bg-purple-600 hover:bg-purple-500 py-3.5 rounded-xl font-semibold transition-colors"
              >
                Connect Wallet
              </button>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-zinc-400 text-sm">
                <span className="text-zinc-300 font-medium">New to crypto?</span> Try Coinbase Wallet — sign up with email, no app needed.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Switch Network */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Wallet connected
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 text-lg">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Switch to Base Sepolia</h2>
                  <p className="text-zinc-400 text-sm">This is the test network we use</p>
                </div>
              </div>
              
              <button
                onClick={handleSwitchNetwork}
                disabled={isSwitching}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isSwitching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Switching...
                  </>
                ) : (
                  'Switch Network'
                )}
              </button>
            </div>

            <details className="bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <summary className="p-4 cursor-pointer text-zinc-400 text-sm hover:text-zinc-300">
                Add network manually
              </summary>
              <div className="px-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between py-2 border-t border-zinc-800">
                  <span className="text-zinc-500">Network</span>
                  <span className="text-zinc-300 font-mono">Base Sepolia</span>
                </div>
                <div className="flex justify-between py-2 border-t border-zinc-800">
                  <span className="text-zinc-500">RPC</span>
                  <span className="text-zinc-300 font-mono text-xs">https://sepolia.base.org</span>
                </div>
                <div className="flex justify-between py-2 border-t border-zinc-800">
                  <span className="text-zinc-500">Chain ID</span>
                  <span className="text-zinc-300 font-mono">84532</span>
                </div>
                <div className="flex justify-between py-2 border-t border-zinc-800">
                  <span className="text-zinc-500">Symbol</span>
                  <span className="text-zinc-300 font-mono">ETH</span>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Step 3: Get Test ETH */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                On Base Sepolia
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 text-lg">3</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Get Test ETH</h2>
                  <p className="text-zinc-400 text-sm">Free tokens to pay for transactions</p>
                </div>
              </div>

              {/* Address display */}
              <div className="mb-4">
                <label className="text-zinc-500 text-xs mb-1.5 block">Your address</label>
                <button
                  onClick={copyAddress}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 px-3 py-2.5 rounded-lg text-left font-mono text-sm text-zinc-300 transition-colors truncate"
                >
                  {address}
                </button>
              </div>
              
              <a
                href={FAUCET_URLS.coinbase}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl font-semibold text-center transition-colors"
              >
                Get Free ETH →
              </a>

              <div className="flex items-center justify-center gap-2 mt-4 text-zinc-500 text-sm">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Checking for balance...
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-zinc-400 text-sm">
                <span className="text-zinc-300 font-medium">Tip:</span> After completing the faucet, tokens arrive in ~30 seconds. This page auto-updates.
              </p>
            </div>

            <div className="text-center">
              <p className="text-zinc-500 text-sm mb-2">Coinbase faucet not working?</p>
              <div className="flex gap-2 justify-center">
                <a
                  href={FAUCET_URLS.alchemy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  Try Alchemy
                </a>
                <span className="text-zinc-600">or</span>
                <a
                  href={FAUCET_URLS.quicknode}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  QuickNode
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-green-500/10 to-zinc-900 rounded-2xl p-6 border border-green-500/20">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-1">You're Ready!</h2>
                <p className="text-zinc-400 text-sm">Balance: <span className="text-green-400 font-semibold">{ethBalance} ETH</span></p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/token-launch"
                  className="flex items-center justify-between w-full bg-purple-600 hover:bg-purple-500 px-4 py-3.5 rounded-xl font-semibold transition-colors"
                >
                  <span>Buy VFIDE Tokens</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/vault"
                  className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  <span>Create a Savings Vault</span>
                  <span className="text-zinc-400">→</span>
                </Link>
                <Link
                  href="/pay"
                  className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  <span>Send a Payment</span>
                  <span className="text-zinc-400">→</span>
                </Link>
                <Link
                  href="/merchant"
                  className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  <span>Accept Payments</span>
                  <span className="text-zinc-400">→</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <Link href="/docs" className="text-zinc-500 hover:text-zinc-400 text-sm">
            Need help? View docs →
          </Link>
        </div>
      </div>
    </div>
  )
}
