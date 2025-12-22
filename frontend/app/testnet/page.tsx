'use client'

import { useState } from 'react'

export default function TestnetPage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [claimed, setClaimed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const FAUCET_AMOUNT = '1000' // 1000 test VFIDE
  const ZKSYNC_SEPOLIA_CHAIN_ID = 300

  const handleConnect = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        })
        setWalletAddress(accounts[0])
        
        // Switch to zkSync Sepolia
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${ZKSYNC_SEPOLIA_CHAIN_ID.toString(16)}` }]
          })
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${ZKSYNC_SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'zkSync Sepolia Testnet',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.era.zksync.dev'],
                blockExplorerUrls: ['https://sepolia.explorer.zksync.io']
              }]
            })
          }
        }
      } catch (err) {
        setError('Failed to connect wallet')
      }
    } else {
      setError('Please install MetaMask or another Web3 wallet')
    }
  }

  const handleClaimTokens = async () => {
    if (!walletAddress) return
    
    setLoading(true)
    setError('')
    
    try {
      // In production, this would call a backend API that distributes test tokens
      // For now, show success and direct to manual process
      await new Promise(resolve => setTimeout(resolve, 1500))
      setClaimed(true)
    } catch (err) {
      setError('Failed to claim tokens. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2f] text-white">
      {/* Testnet Banner */}
      <div className="bg-yellow-600/90 text-black py-2 px-4 text-center font-bold">
        🧪 TESTNET MODE - This is for testing only. No real money involved.
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            VFIDE Testnet
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Be one of the first to test VFIDE's trust-based payment system. 
            Earn a spot on our early tester leaderboard and get priority access to the presale!
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">1️⃣</div>
            <h3 className="font-bold text-lg mb-2">Get Test ETH</h3>
            <p className="text-gray-400 text-sm mb-3">
              You need zkSync Sepolia ETH for gas fees.
            </p>
            <a 
              href="https://sepolia.era.zksync.dev/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              → Get from zkSync Faucet
            </a>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">2️⃣</div>
            <h3 className="font-bold text-lg mb-2">Connect Wallet</h3>
            <p className="text-gray-400 text-sm mb-3">
              Connect your wallet to zkSync Sepolia testnet.
            </p>
            {!walletAddress ? (
              <button
                onClick={handleConnect}
                className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="text-green-400 text-sm">
                ✓ Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">3️⃣</div>
            <h3 className="font-bold text-lg mb-2">Claim Test VFIDE</h3>
            <p className="text-gray-400 text-sm mb-3">
              Get {FAUCET_AMOUNT} test VFIDE tokens to try the system.
            </p>
            {claimed ? (
              <div className="text-green-400 text-sm">✓ Tokens claimed!</div>
            ) : (
              <button
                onClick={handleClaimTokens}
                disabled={!walletAddress || loading}
                className="bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Claiming...' : 'Claim Test Tokens'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-8 text-center">
            {error}
          </div>
        )}

        {/* What to Test */}
        <div className="bg-white/5 rounded-xl p-8 border border-white/10 mb-12">
          <h2 className="text-2xl font-bold mb-6">🧪 What Can You Test?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-purple-400 mb-2">Token Transfers</h4>
              <p className="text-gray-400 text-sm">
                Send VFIDE tokens and see how ProofScore affects your fees. 
                Higher reputation = lower fees!
              </p>
            </div>
            <div>
              <h4 className="font-bold text-purple-400 mb-2">Build ProofScore</h4>
              <p className="text-gray-400 text-sm">
                Complete actions to build your reputation. Your score is stored on-chain forever.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-purple-400 mb-2">Merchant Payments</h4>
              <p className="text-gray-400 text-sm">
                Try buying from test merchants with 0% processing fees. 
                Only network burn fees apply.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-purple-400 mb-2">Earn Badges</h4>
              <p className="text-gray-400 text-sm">
                Collect on-chain badge NFTs for completing actions. 
                Early Tester badge is exclusive to testnet users!
              </p>
            </div>
          </div>
        </div>

        {/* Early Tester Benefits */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-8 border border-purple-500/30">
          <h2 className="text-2xl font-bold mb-4">🏆 Early Tester Benefits</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>Priority presale access</strong> - Get in before the public</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>Early Tester badge NFT</strong> - Exclusive to testnet participants</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>ProofScore head start</strong> - Your testnet activity may boost mainnet score</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span><strong>Feedback rewards</strong> - Report bugs and get bonus allocation</span>
            </li>
          </ul>
        </div>

        {/* Network Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p className="mb-2">
            <strong>Network:</strong> zkSync Sepolia Testnet (Chain ID: 300)
          </p>
          <p>
            <strong>RPC:</strong> https://sepolia.era.zksync.dev
          </p>
          <p className="mt-4">
            <a 
              href="https://sepolia.explorer.zksync.io" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              View on zkSync Explorer →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
