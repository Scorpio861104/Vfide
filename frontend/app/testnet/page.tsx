'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useChainId, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { zkSyncSepoliaTestnet } from 'wagmi/chains'

export default function TestnetPage() {
  const [copied, setCopied] = useState(false)

  // Wallet state
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData } = useBalance({ address })
  const { openConnectModal } = useConnectModal()

  const ZKSYNC_SEPOLIA_CHAIN_ID = zkSyncSepoliaTestnet.id
  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'
  const isOnCorrectChain = chainId === ZKSYNC_SEPOLIA_CHAIN_ID
  const hasBalance = parseFloat(ethBalance) >= 0.001

  // Determine which step they're on
  const step = !isConnected ? 1 : !isOnCorrectChain ? 2 : !hasBalance ? 3 : 4

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2f] text-white">
      {/* Banner */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black py-4 px-4 text-center">
        <p className="font-bold text-lg">🧪 TESTNET - 100% Free to Try!</p>
        <p className="text-sm">No real money. No risk. Just fun.</p>
      </div>

      {/* Toast */}
      {copied && (
        <div className="fixed top-24 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          ✓ Copied!
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Try VFIDE
          </h1>
          <p className="text-2xl text-gray-300">
            Takes 2 minutes. Free forever.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-3 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                step > s ? 'bg-green-500' : step === s ? 'bg-purple-500 ring-4 ring-purple-500/30' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Connect */}
        {step === 1 && (
          <div className="text-center">
            <div className="bg-white/5 rounded-3xl p-10 border border-white/10">
              <div className="text-8xl mb-6">👋</div>
              <h2 className="text-3xl font-bold mb-4">Let&apos;s Get Started</h2>
              <p className="text-gray-400 text-lg mb-8">
                Click below to sign in.<br/>
                <span className="text-purple-400">Use Coinbase Wallet for the easiest setup</span> - just your email!
              </p>
              
              <button
                onClick={openConnectModal}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-6 rounded-2xl text-2xl font-bold transition-all transform hover:scale-[1.02] shadow-xl shadow-purple-500/20"
              >
                🚀 Sign In
              </button>

              <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl text-left">
                <p className="text-blue-400 font-bold mb-2">💡 First time? Choose Coinbase Wallet</p>
                <p className="text-gray-400 text-sm">
                  It lets you create an account with just your email - no crypto experience needed!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Wrong Network */}
        {step === 2 && (
          <div className="text-center">
            <div className="bg-white/5 rounded-3xl p-10 border border-white/10">
              <div className="text-8xl mb-6">🔄</div>
              <h2 className="text-3xl font-bold mb-4">Switch Networks</h2>
              
              <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-6">
                <p className="text-green-400 font-bold">✓ You&apos;re connected!</p>
              </div>

              <p className="text-gray-400 text-lg mb-6">
                We need to switch to the zkSync Sepolia test network.<br/>
                <span className="text-yellow-400">Open your wallet app and switch there.</span>
              </p>

              {/* Network details card */}
              <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 border border-purple-500/30 text-left mb-6">
                <p className="text-white font-bold text-lg mb-4 text-center">📍 Network to Add:</p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-mono">zkSync Sepolia</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <span className="text-gray-400">RPC:</span>
                    <span className="text-white font-mono text-sm">sepolia.era.zksync.dev</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <span className="text-gray-400">Chain ID:</span>
                    <span className="text-white font-mono">300</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white font-mono">ETH</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-sm">
                This page will update automatically when you switch.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Get Test ETH */}
        {step === 3 && (
          <div className="text-center">
            <div className="bg-white/5 rounded-3xl p-10 border border-white/10">
              <div className="text-8xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold mb-4">Almost There!</h2>
              
              <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-6">
                <p className="text-green-400 font-bold">✓ Connected to zkSync Sepolia!</p>
              </div>

              <p className="text-gray-400 text-lg mb-6">
                Get some free test tokens to try everything:
              </p>

              {/* Wallet address */}
              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <p className="text-gray-500 text-sm mb-2">Your address (click to copy):</p>
                <button
                  onClick={copyAddress}
                  className="w-full text-left bg-black/50 px-4 py-3 rounded-lg text-purple-300 font-mono text-sm hover:bg-black/70 transition-colors truncate"
                >
                  {address}
                </button>
              </div>

              {/* Faucet buttons */}
              <div className="space-y-3">
                <a
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-6 py-5 rounded-xl text-xl font-bold transition-all"
                >
                  🚰 Get Free Test ETH (Google)
                </a>
                <a
                  href="https://faucet.quicknode.com/ethereum/sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold border border-white/20 transition-all"
                >
                  Alternative: QuickNode Faucet
                </a>
              </div>

              <p className="text-gray-500 text-sm mt-6">
                This page updates automatically when you get tokens.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Ready! */}
        {step === 4 && (
          <div className="text-center">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-3xl p-10 border border-green-500/30">
              <div className="text-8xl mb-6">🎊</div>
              <h2 className="text-3xl font-bold mb-4 text-green-400">You&apos;re Ready!</h2>
              
              <div className="bg-green-900/50 border border-green-500/50 rounded-xl p-6 mb-8">
                <p className="text-green-300 text-2xl font-bold">{ethBalance} ETH</p>
                <p className="text-green-400 text-sm mt-1">Available for testing</p>
              </div>

              <p className="text-gray-300 text-lg mb-8">
                Explore everything VFIDE has to offer:
              </p>

              <div className="space-y-4">
                <Link
                  href="/token-launch"
                  className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-6 py-5 rounded-xl text-xl font-bold transition-all"
                >
                  🪙 Buy Test Tokens
                </Link>
                <Link
                  href="/vault"
                  className="block w-full bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold border border-white/20 transition-all"
                >
                  🏦 Create a Savings Vault
                </Link>
                <Link
                  href="/pay"
                  className="block w-full bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold border border-white/20 transition-all"
                >
                  💸 Send a Payment
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Help Footer */}
        <div className="mt-10 text-center">
          <Link href="/docs" className="text-gray-500 hover:text-gray-300 text-sm underline">
            Need help?
          </Link>
        </div>
      </div>
    </div>
  )
}
