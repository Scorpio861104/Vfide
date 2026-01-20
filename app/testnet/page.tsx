'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { FAUCET_URLS } from '@/lib/testnet'
import { isTestnetChainId } from '@/lib/chains'
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard'

export default function TestnetPage() {
  const router = useRouter()
  const { copied, copy } = useCopyToClipboard()
  const { address } = useAccount()
  const chainId = useChainId()

  // Redirect to home if not on testnet
  useEffect(() => {
    if (chainId && !isTestnetChainId(chainId)) {
      router.push('/')
    }
  }, [router, chainId])

  const copyAddress = () => {
    if (address) {
      copy(address)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-900 text-white pt-20">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-2">Get Test ETH</h1>
          <p className="text-zinc-400 mb-8">
            You need test ETH to pay for transactions on Base Sepolia. It&apos;s free.
          </p>

          {/* Address section */}
          {address && (
            <div className="bg-zinc-900 rounded-lg p-4 mb-6 border border-zinc-800">
              <label className="text-zinc-500 text-xs mb-1 block">Your wallet address</label>
              <button
                onClick={copyAddress}
                className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-sm font-mono text-zinc-300 truncate transition-colors"
              >
                {address}
              </button>
              {copied && <p className="text-green-400 text-xs mt-1">Copied!</p>}
            </div>
          )}

          {/* Faucets */}
          <div className="space-y-3 mb-8">
            <a
              href={FAUCET_URLS.coinbase}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <span>Coinbase Faucet</span>
              <span>→</span>
            </a>
            <a
              href={FAUCET_URLS.alchemy}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <span>Alchemy Faucet</span>
              <span>→</span>
            </a>
            <a
              href={FAUCET_URLS.quicknode}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <span>QuickNode Faucet</span>
              <span>→</span>
            </a>
          </div>

          {/* Network info */}
          <details className="bg-zinc-900 rounded-lg border border-zinc-800">
            <summary className="p-4 cursor-pointer text-zinc-400 hover:text-zinc-300">
              Add Base Sepolia manually
            </summary>
            <div className="px-4 pb-4 space-y-2 text-sm border-t border-zinc-800 pt-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Network</span>
                <span className="text-zinc-300 font-mono">Base Sepolia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">RPC</span>
                <span className="text-zinc-300 font-mono text-xs">https://sepolia.base.org</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Chain ID</span>
                <span className="text-zinc-300 font-mono">84532</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Symbol</span>
                <span className="text-zinc-300 font-mono">ETH</span>
              </div>
            </div>
          </details>

          <div className="mt-8 text-center">
            <Link href="/token-launch" className="text-purple-400 hover:text-purple-300">
              ← Back to app
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
