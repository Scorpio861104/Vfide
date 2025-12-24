'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useChainId, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { zkSyncSepoliaTestnet } from 'wagmi/chains'

export default function TestnetPage() {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Use wagmi hooks for wallet state
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData } = useBalance({ address })
  const { openConnectModal } = useConnectModal()

  const ZKSYNC_SEPOLIA_CHAIN_ID = zkSyncSepoliaTestnet.id // 300
  const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x3249215721a21BC9635C01Ea05AdE032dd90961f'

  const ethBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'
  const isOnCorrectChain = chainId === ZKSYNC_SEPOLIA_CHAIN_ID

  // Detect mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
  }, [])

  // Auto-progress based on wallet state
  useEffect(() => {
    if (!isConnected) {
      setStep(1)
    } else if (!isOnCorrectChain) {
      setStep(3)
    } else if (parseFloat(ethBalance) < 0.001) {
      setStep(4)
    } else {
      setStep(5)
    }
  }, [isConnected, isOnCorrectChain, ethBalance])

  const handleConnect = () => {
    if (openConnectModal) {
      openConnectModal()
    }
  }

  const copyToClipboard = (text: string, field?: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    if (field) setCopiedField(field)
    setTimeout(() => {
      setCopied(false)
      setCopiedField(null)
    }, 2000)
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2f] text-white">
      {/* Testnet Banner */}
      <div className="bg-yellow-500 text-black py-3 px-4 text-center font-bold text-lg">
        🧪 TESTNET MODE - Free to test, no real money needed!
      </div>

      {/* Copy Toast */}
      {copied && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          ✓ Copied to clipboard!
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Try VFIDE Free
          </h1>
          <p className="text-xl text-gray-300">
            5 minutes to test the future of payments. No money required.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between mb-2">
            {['Connect', 'Confirm', 'Network', 'ETH', 'Explore'].map((label, idx) => (
              <span
                key={label}
                className={`text-sm ${step > idx ? 'text-green-400' : step === idx + 1 ? 'text-purple-400' : 'text-gray-600'}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Back Button */}
        {step > 1 && step < 5 && (
          <button onClick={goBack} className="mb-4 text-gray-400 hover:text-white text-sm flex items-center gap-1">
            ← Back to previous step
          </button>
        )}

        {/* Step 1 & 2: Connect Wallet */}
        {(step === 1 || step === 2) && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🔗</div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                {isMobile
                  ? "Tap below to connect. Use WalletConnect to scan a QR code, or connect directly with your mobile wallet."
                  : "Click below to connect your wallet. If you don't have one, you'll be guided to install MetaMask."
                }
              </p>

              <button
                onClick={handleConnect}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
              >
                🔗 Connect Wallet
              </button>

              <div className="mt-8 p-4 bg-white/5 rounded-lg text-left">
                <p className="text-gray-400 text-sm mb-3">
                  <span className="text-purple-400 font-semibold">💡 Wallet options:</span>
                </p>
                <ul className="text-gray-500 text-sm space-y-2">
                  <li>• <strong>WalletConnect</strong> - Scan QR code from any wallet app (recommended)</li>
                  <li>• <strong>Coinbase Wallet</strong> - Great for beginners</li>
                  <li>• <strong>MetaMask</strong> - Most popular option</li>
                  <li>• <strong>Rainbow</strong> - Beautiful mobile wallet</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Switch Network */}
        {step === 3 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🌐</div>
              <h2 className="text-2xl font-bold mb-4">Switch to Test Network</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                You&apos;re connected! Now let&apos;s switch to the zkSync Sepolia testnet.
              </p>

              <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-400">
                  Connected: <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </p>
                <p className="text-xs text-purple-300 mt-1">
                  Current network: {chainId === 1 ? 'Ethereum Mainnet' : chainId === 300 ? 'zkSync Sepolia ✓' : `Chain ${chainId}`}
                </p>
              </div>

              {/* Clear instructions */}
              <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-6 mb-6">
                <p className="text-purple-300 font-bold text-lg mb-4 text-center">
                  📱 How to Switch Networks
                </p>
                <div className="space-y-3 text-left">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-white">1</div>
                    <div>
                      <p className="text-white font-semibold">Open your wallet app</p>
                      <p className="text-gray-400 text-sm">MetaMask, Trust Wallet, Coinbase Wallet, etc.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-white">2</div>
                    <div>
                      <p className="text-white font-semibold">Find the network selector</p>
                      <p className="text-gray-400 text-sm">Usually at the top of the app (shows "Ethereum Mainnet" or similar)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-white">3</div>
                    <div>
                      <p className="text-white font-semibold">Select "zkSync Sepolia Testnet"</p>
                      <p className="text-gray-400 text-sm">If it's not in the list, you'll need to add it manually (see below)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Network Details - Always visible with copy buttons */}
              <div className="bg-black/30 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-bold">zkSync Sepolia Network Details</p>
                  <span className="text-xs text-gray-500">Copy each field to add manually</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Network Name', value: 'zkSync Sepolia Testnet', icon: '🏷️' },
                    { label: 'RPC URL', value: 'https://sepolia.era.zksync.dev', icon: '🔗' },
                    { label: 'Chain ID', value: '300', icon: '#️⃣' },
                    { label: 'Currency Symbol', value: 'ETH', icon: '💎' },
                    { label: 'Block Explorer', value: 'https://sepolia.explorer.zksync.io', icon: '🔍' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-400 text-xs">{item.label}</p>
                          <p className="text-white text-sm font-mono truncate">{item.value}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.value, item.label)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                          copiedField === item.label
                            ? 'bg-green-600 text-white'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {copiedField === item.label ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help text */}
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm">
                  <strong className="text-yellow-400">💡 Tip:</strong> This page will automatically refresh once you switch networks
                </p>
                <p className="text-gray-500 text-xs">
                  Having trouble? Make sure you're using the latest version of your wallet app
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Get Test ETH */}
        {step === 4 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">💰</div>
              <h2 className="text-2xl font-bold mb-4">Get Free Test ETH</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                You need a tiny bit of test ETH (gas) to make transactions. It&apos;s free and takes 1 minute.
              </p>

              <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-400">
                  ✓ Connected to zkSync Sepolia Testnet
                </p>
                <p className="text-xs text-green-300 mt-1">
                  Balance: {ethBalance} ETH
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg text-left">
                  <p className="font-bold text-white mb-2">1. Copy your address:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-black/50 px-3 py-2 rounded text-sm flex-1 truncate">
                      {address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(address || '')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded font-bold text-sm"
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg text-left">
                  <p className="font-bold text-white mb-2">2. Get free ETH from a faucet:</p>
                  <div className="space-y-2">
                    <a
                      href="https://faucet.quicknode.com/ethereum/sepolia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-blue-600 hover:bg-blue-500 rounded text-center font-bold"
                    >
                      🚰 QuickNode Sepolia Faucet
                    </a>
                    <a
                      href="https://www.alchemy.com/faucets/zksync-sepolia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-indigo-600 hover:bg-indigo-500 rounded text-center font-bold"
                    >
                      🚰 Alchemy zkSync Sepolia Faucet
                    </a>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Paste your address, complete any verification, and receive free test ETH
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg text-left">
                  <p className="font-bold text-white mb-2">3. Wait for ETH (usually ~30 seconds)</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold text-sm"
                  >
                    🔄 Refresh to check balance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Explore */}
        {step === 5 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold mb-4 text-green-400">You&apos;re Ready!</h2>
              <p className="text-gray-300 mb-8 max-w-lg mx-auto">
                Your wallet is connected and funded on zkSync Sepolia testnet. Time to explore VFIDE!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                  <p className="text-sm text-green-400">Wallet</p>
                  <p className="text-lg font-mono">{address?.slice(0, 8)}...{address?.slice(-6)}</p>
                </div>
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                  <p className="text-sm text-green-400">Balance</p>
                  <p className="text-lg font-bold">{ethBalance} ETH</p>
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  href="/vault"
                  className="block w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
                >
                  🏦 Create Your Vault
                </Link>

                <Link
                  href="/token-launch"
                  className="block w-full px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
                >
                  🚀 Join Presale (Test)
                </Link>

                <Link
                  href="/"
                  className="block w-full px-6 py-3 border-2 border-gray-600 hover:border-gray-400 rounded-xl font-bold transition-all"
                >
                  ← Back to Home
                </Link>
              </div>

              {/* Quick token info */}
              <div className="mt-8 p-4 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">📍 Token Contract (for your wallet):</p>
                <div className="flex items-center gap-2">
                  <code className="bg-black/50 px-3 py-1 rounded text-xs flex-1 truncate">
                    {TOKEN_ADDRESS}
                  </code>
                  <button
                    onClick={() => copyToClipboard(TOKEN_ADDRESS)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-12 bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">❓ Common Questions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-purple-400 font-semibold">What is a testnet?</p>
              <p className="text-gray-400">A playground version of the blockchain where everything is free. Perfect for trying VFIDE without risk.</p>
            </div>
            <div>
              <p className="text-purple-400 font-semibold">Is this real money?</p>
              <p className="text-gray-400">No! Test ETH and test VFIDE tokens have no real value. This is just for testing.</p>
            </div>
            <div>
              <p className="text-purple-400 font-semibold">Which wallet should I use?</p>
              <p className="text-gray-400">Any wallet works! MetaMask, Coinbase Wallet, Rainbow, Trust Wallet - just connect via the button above.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Need help? Join our <a href="https://discord.gg/vfide" className="text-purple-400 hover:underline">Discord</a></p>
        </div>
      </div>
    </div>
  )
}
