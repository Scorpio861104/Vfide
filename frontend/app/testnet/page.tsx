'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useChainId, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { zkSyncSepoliaTestnet } from 'wagmi/chains'

export default function TestnetPage() {
  const [copied, setCopied] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [confetti, setConfetti] = useState(false)

  // Wallet state
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData, refetch } = useBalance({ address })
  const { openConnectModal } = useConnectModal()

  const ZKSYNC_SEPOLIA_CHAIN_ID = zkSyncSepoliaTestnet.id
  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'
  const isOnCorrectChain = chainId === ZKSYNC_SEPOLIA_CHAIN_ID
  const hasBalance = parseFloat(ethBalance) >= 0.0001

  // Calculate step
  const step = !isConnected ? 1 : !isOnCorrectChain ? 2 : !hasBalance ? 3 : 4

  // Show help after delay on steps 2-3
  useEffect(() => {
    if (step === 2 || step === 3) {
      const timer = setTimeout(() => setShowHelp(true), 8000)
      return () => clearTimeout(timer)
    }
    setShowHelp(false)
  }, [step])

  // Poll for balance updates on step 3
  useEffect(() => {
    if (step === 3) {
      const interval = setInterval(() => refetch(), 5000)
      return () => clearInterval(interval)
    }
  }, [step, refetch])

  // Celebration when reaching step 4
  useEffect(() => {
    if (step === 4) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 3000)
    }
  }, [step])

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#12121a] to-[#1a1a2f] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Confetti effect */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'][Math.floor(Math.random() * 5)],
                width: '10px',
                height: '10px',
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      {/* Banner */}
      <div className="relative bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 text-black py-4 px-4 text-center">
        <p className="font-bold text-lg">🧪 TESTNET - Play with fake money!</p>
        <p className="text-sm opacity-80">100% free. Zero risk. All fun.</p>
      </div>

      {/* Toast */}
      {copied && (
        <div className="fixed top-24 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce">
          ✓ Copied!
        </div>
      )}

      <div className="relative max-w-lg mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Try VFIDE
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            {step === 1 && "Let's set you up in 2 minutes"}
            {step === 2 && "Almost there! One quick step"}
            {step === 3 && "Last step - get free tokens"}
            {step === 4 && "🎉 You're ready to explore!"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-center items-center gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 ${
                  step > s
                    ? 'bg-green-500 text-white scale-90'
                    : step === s
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 ring-4 ring-purple-500/30'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 4 && (
                <div className={`w-8 h-1 mx-1 rounded ${step > s ? 'bg-green-500' : 'bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Connect */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl">
              <div className="text-center mb-8">
                <div className="text-8xl mb-6 animate-wave">👋</div>
                <h2 className="text-3xl font-bold mb-3">Welcome!</h2>
                <p className="text-gray-400 text-lg">
                  First, let&apos;s connect your account.
                </p>
              </div>
              
              <button
                onClick={openConnectModal}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-6 rounded-2xl text-2xl font-bold transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98]"
              >
                🚀 Get Started
              </button>

              <div className="mt-8 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                  <span className="text-xl">💡</span> New to crypto?
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Choose <strong className="text-white">Coinbase Wallet</strong> - you can sign up with just your email. No downloads needed!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Switch Network */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-8xl mb-6">🔄</div>
                <h2 className="text-3xl font-bold mb-3">Switch Networks</h2>
                
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full mb-4">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Connected!
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-500/20 mb-6">
                <p className="text-center text-gray-300 mb-4">
                  Open your wallet app and switch to:
                </p>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white mb-1">zkSync Sepolia</p>
                  <p className="text-gray-400 text-sm">Test Network</p>
                </div>
              </div>

              {/* Network details for manual add */}
              <details className="group">
                <summary className="cursor-pointer text-gray-400 hover:text-white text-sm flex items-center gap-2 justify-center py-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Need to add it manually?
                </summary>
                <div className="mt-4 space-y-2 text-sm">
                  {[
                    { label: 'Network', value: 'zkSync Sepolia Testnet' },
                    { label: 'RPC', value: 'https://sepolia.era.zksync.dev' },
                    { label: 'Chain ID', value: '300' },
                    { label: 'Symbol', value: 'ETH' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center bg-black/30 rounded-lg p-3">
                      <span className="text-gray-500">{item.label}:</span>
                      <span className="text-white font-mono text-xs">{item.value}</span>
                    </div>
                  ))}
                </div>
              </details>

              <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                Waiting for you to switch...
              </div>

              {showHelp && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-fadeIn">
                  <p className="text-yellow-400 font-bold text-sm mb-2">💡 Stuck?</p>
                  <p className="text-gray-300 text-sm">
                    In your wallet app, tap the network name at the top (like &quot;Ethereum&quot;), then search for &quot;zkSync Sepolia&quot; or add it manually using the details above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Get Test ETH */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-8xl mb-6">🎁</div>
                <h2 className="text-3xl font-bold mb-3">Get Free Tokens</h2>
                
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full mb-4">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  On zkSync Sepolia ✓
                </div>
              </div>

              {/* Address */}
              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <p className="text-gray-500 text-xs mb-2">Your address (tap to copy):</p>
                <button
                  onClick={copyAddress}
                  className="w-full text-left bg-black/50 hover:bg-black/70 px-4 py-3 rounded-lg text-purple-300 font-mono text-sm transition-colors truncate"
                >
                  {address}
                </button>
              </div>

              {/* Faucet */}
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-6 py-5 rounded-xl text-xl font-bold text-center transition-all transform hover:scale-[1.02] mb-3"
              >
                🚰 Get Free Test Tokens
              </a>
              
              <p className="text-center text-gray-500 text-sm mb-6">
                Opens Google&apos;s free faucet in a new tab
              </p>

              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                Checking every 5 seconds...
              </div>

              {showHelp && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-fadeIn">
                  <p className="text-yellow-400 font-bold text-sm mb-2">💡 Pro tip</p>
                  <p className="text-gray-300 text-sm">
                    The faucet may ask you to solve a quick puzzle (CAPTCHA). After that, tokens arrive in about 30 seconds. This page updates automatically!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Success! */}
        {step === 4 && (
          <div className="animate-fadeIn">
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-green-500/30 shadow-2xl shadow-green-500/10">
              <div className="text-center mb-8">
                <div className="text-8xl mb-6 animate-bounce">🎊</div>
                <h2 className="text-3xl font-bold mb-3 text-green-400">You Did It!</h2>
                
                <div className="bg-green-500/20 rounded-xl p-4 mb-4 inline-block">
                  <p className="text-green-300 text-3xl font-bold">{ethBalance} ETH</p>
                  <p className="text-green-400 text-sm">Ready to spend</p>
                </div>
              </div>

              <p className="text-center text-gray-300 mb-8">
                Now the fun begins! Try these:
              </p>

              <div className="space-y-3">
                <Link
                  href="/token-launch"
                  className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-6 py-5 rounded-xl text-xl font-bold text-center transition-all transform hover:scale-[1.02]"
                >
                  🪙 Buy VFIDE Tokens
                </Link>
                <Link
                  href="/vault"
                  className="block w-full bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold text-center border border-white/10 transition-all"
                >
                  🏦 Create a Savings Vault
                </Link>
                <Link
                  href="/pay"
                  className="block w-full bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold text-center border border-white/10 transition-all"
                >
                  💸 Send a Payment
                </Link>
                <Link
                  href="/merchant"
                  className="block w-full bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold text-center border border-white/10 transition-all"
                >
                  🏪 Accept Payments
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center text-gray-600 text-sm">
          <p>This is a testnet. No real money involved.</p>
          <Link href="/docs" className="text-purple-400 hover:text-purple-300 underline mt-2 inline-block">
            Need help?
          </Link>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
          display: inline-block;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
