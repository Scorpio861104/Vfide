'use client'

export const dynamic = 'force-dynamic';

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { FAUCET_URLS } from '@/lib/testnet'
import { getExplorerUrlForChainId, isTestnetChainId } from '@/lib/chains'
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard'

export default function TestnetPage() {
  const router = useRouter()
  const { copied, copy } = useCopyToClipboard()
  const { address } = useAccount()
  const chainId = useChainId()
  const explorerBase = getExplorerUrlForChainId(chainId || 84532)

  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)

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

  const claimVFIDE = useCallback(async () => {
    if (!address || isClaiming) return
    setIsClaiming(true)
    setClaimError(null)

    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      const res = await fetch('/api/faucet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, referrer: ref || undefined }),
      })
      const data = await res.json()

      if (res.status === 409) {
        setAlreadyClaimed(true)
        setClaimSuccess(true)
        return
      }
      if (!res.ok) {
        setClaimError(data.error || 'Claim failed. Try again.')
        return
      }

      setClaimSuccess(true)
      if (data.txHash) setClaimTxHash(data.txHash)
    } catch {
      setClaimError('Network error. Please try again.')
    } finally {
      setIsClaiming(false)
    }
  }, [address, isClaiming])

  return (
    <>
      <div className="min-h-screen bg-zinc-900 text-white pt-20">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-2">Testnet Setup</h1>
          <p className="text-zinc-400 mb-8">
            Get test ETH and VFIDE to start testing on Base Sepolia.
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

          {/* Step 1 – Get gas ETH */}
          <h2 className="text-lg font-semibold mb-3 text-zinc-200">Step 1 — Get gas ETH</h2>
          <p className="text-zinc-500 text-sm mb-4">
            You need test ETH to pay for transactions on Base Sepolia. It&apos;s free.
          </p>
          <div className="space-y-3 mb-10">
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

          {/* Step 2 – Claim test VFIDE */}
          <h2 className="text-lg font-semibold mb-3 text-zinc-200">Step 2 — Claim test VFIDE</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Receive 10,000 test VFIDE + 0.005 ETH gas top-up directly to your wallet.
          </p>

          {claimSuccess ? (
            <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-4 mb-6">
              <p className="text-emerald-400 font-medium">
                {alreadyClaimed ? '✓ Already claimed — your VFIDE is in your wallet.' : '✓ 10,000 VFIDE + gas ETH sent to your wallet!'}
              </p>
              {claimTxHash && (
                <a
                  href={`${explorerBase}/tx/${claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 text-sm underline mt-1 inline-block"
                >
                  View transaction →
                </a>
              )}
            </div>
          ) : (
            <>
              {claimError && (
                <p className="text-red-400 text-sm mb-3">{claimError}</p>
              )}
              <button
                onClick={claimVFIDE}
                disabled={!address || isClaiming}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors mb-6"
              >
                {isClaiming ? 'Claiming…' : address ? 'Claim 10,000 VFIDE' : 'Connect wallet to claim'}
              </button>
            </>
          )}

          {/* Network info */}
          <details className="bg-zinc-900 rounded-lg border border-zinc-800 mb-8">
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
            <Link href="/" className="text-purple-400 hover:text-purple-300">
              ← Back to app
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
