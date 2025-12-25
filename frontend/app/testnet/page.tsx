'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useBalance } from 'wagmi'
import { zkSyncSepoliaTestnet } from 'viem/chains'

export default function TestnetPage() {
  const [copied, setCopied] = useState(false)
  
  // Privy hooks
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  
  // Get wallet address
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
  const activeWallet = embeddedWallet || wallets[0]
  const address = activeWallet?.address as `0x${string}` | undefined

  // Get balance on zkSync Sepolia
  const { data: balanceData, isLoading: balanceLoading } = useBalance({ 
    address,
    chainId: zkSyncSepoliaTestnet.id,
  })
  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'
  const hasBalance = parseFloat(ethBalance) >= 0.0001

  // Determine step
  const getStep = () => {
    if (!ready) return 0 // Loading
    if (!authenticated) return 1 // Need to sign in
    if (!address) return 2 // Creating wallet
    if (!hasBalance) return 3 // Need test ETH
    return 4 // Ready!
  }
  const step = getStep()

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Get user display name
  const userDisplay = user?.email?.address || user?.google?.email || 'Connected'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2f] text-white">
      {/* Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-black py-4 px-4 text-center">
        <p className="font-bold text-lg">🧪 TESTNET - 100% Free!</p>
        <p className="text-sm">No wallet app needed. Just your email.</p>
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
            Just your email. That&apos;s it.
          </p>
        </div>

        {/* Progress dots */}
        {step > 0 && (
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
        )}

        {/* Step 0: Loading */}
        {step === 0 && (
          <div className="text-center py-20">
            <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-gray-400 text-xl">Loading VFIDE...</p>
          </div>
        )}

        {/* Step 1: Sign In */}
        {step === 1 && (
          <div className="text-center">
            <div className="bg-white/5 rounded-3xl p-10 border border-white/10">
              <div className="text-8xl mb-6">👋</div>
              <h2 className="text-3xl font-bold mb-4">Welcome!</h2>
              <p className="text-gray-400 text-lg mb-8">
                Sign in with your email or Google account.<br/>
                <span className="text-purple-400">We&apos;ll create your wallet automatically.</span>
              </p>
              
              <button
                onClick={login}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-6 rounded-2xl text-2xl font-bold transition-all transform hover:scale-[1.02] shadow-xl shadow-purple-500/20"
              >
                🚀 Get Started
              </button>

              <p className="text-gray-500 text-sm mt-6">
                No wallet app needed. No seed phrases. No confusion.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Creating Wallet */}
        {step === 2 && (
          <div className="text-center">
            <div className="bg-white/5 rounded-3xl p-10 border border-white/10">
              <div className="animate-spin w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
              <h2 className="text-3xl font-bold mb-4">Setting Up...</h2>
              <p className="text-gray-400 text-lg">
                Creating your secure wallet.<br/>
                This only takes a moment.
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
                <p className="text-green-400 font-bold">✓ Account Created!</p>
                <p className="text-gray-400 text-sm mt-1">{userDisplay}</p>
              </div>

              <p className="text-gray-400 text-lg mb-6">
                Get some free test tokens to try everything:
              </p>

              {/* Wallet address */}
              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <p className="text-gray-500 text-sm mb-2">Your wallet address:</p>
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
                  🚰 Get Free Test ETH
                </a>
              </div>

              <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl text-left">
                <p className="text-purple-400 font-bold mb-2">💡 How it works:</p>
                <ol className="text-gray-400 text-sm space-y-1">
                  <li>1. Click the button above</li>
                  <li>2. Paste your wallet address</li>
                  <li>3. Complete the captcha</li>
                  <li>4. Come back here - we&apos;ll detect it automatically!</li>
                </ol>
              </div>

              {balanceLoading && (
                <p className="text-gray-500 text-sm mt-4 animate-pulse">
                  Checking for tokens...
                </p>
              )}
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

        {/* Footer */}
        <div className="mt-10 text-center space-y-4">
          {authenticated && (
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-300 text-sm underline"
            >
              Sign Out
            </button>
          )}
          <p className="text-gray-600 text-xs">
            This is a testnet. No real money involved.
          </p>
        </div>
      </div>
    </div>
  )
}
