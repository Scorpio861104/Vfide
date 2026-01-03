'use client'

import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { ArrowLeft, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'
import { BadgeGallery } from '@/components/badge/BadgeGallery'
import { EndorsementStats } from '@/components/trust/EndorsementStats'
import { useProofScore } from '@/lib/vfide-hooks'

export default function AddressPage() {
  const params = useParams()
  const { address: connectedAddress } = useAccount()
  const address = params.id as `0x${string}`
  const [copied, setCopied] = useState(false)
  
  // Validate address format
  const isValidAddress = address && address.startsWith('0x') && address.length === 42
  
  const { score: _score, tier, canVote, canMerchant, isLoading } = useProofScore(
    isValidAddress ? address : undefined
  )

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
  }

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  if (!isValidAddress) {
    return (
      <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Address</h1>
          <p className="text-gray-300 mb-4">The address format is not valid</p>
          <Link href="/leaderboard" className="text-blue-400 hover:underline">
            Back to Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>
        
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">User Profile</h1>
          
          {/* Address Display */}
          <div className="flex items-center gap-3 bg-gray-800/50 rounded px-4 py-3 mb-4">
            <code className="text-sm text-gray-300 flex-1">{address}</code>
            <button
              onClick={copyAddress}
              className="p-2 hover:bg-gray-700 rounded transition"
              title="Copy address"
            >
              {copied ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* Is self? */}
          {connectedAddress?.toLowerCase() === address.toLowerCase() && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded px-4 py-2 text-sm text-blue-200">
              ✓ This is your profile
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Score & Stats */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {/* ProofScore Visualizer */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6">
              <ProofScoreVisualizer
                address={address}
                size="medium"
                showDetails={true}
                showBadges={false}
                showBreakdown={false}
                showEndorsements={true}
              />
            </div>

            {/* Trust Tier Info */}
            <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-gray-400">Trust Tier:</span>
                  <span className="ml-2 font-bold text-amber-300">{tier || 'Loading...'}</span>
                </div>
                {!isLoading && (
                  <>
                    <div>
                      <span className="text-gray-400">Can Vote:</span>
                      <span className="ml-2">{canVote ? '✓ Yes' : '✗ No'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Can Be Merchant:</span>
                      <span className="ml-2">{canMerchant ? '✓ Yes' : '✗ No'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Endorsement Stats */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Endorsements</h2>
            <EndorsementStats address={address} size="medium" />
          </div>

          {/* Badges */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Badges</h2>
            <BadgeGallery address={address} />
          </div>

          {/* Endorsement Action (if viewing someone else's profile) */}
          {connectedAddress && connectedAddress.toLowerCase() !== address.toLowerCase() && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Actions</h2>
              <ProofScoreVisualizer
                address={connectedAddress}
                size="small"
                showDetails={false}
                showBadges={false}
                showBreakdown={false}
                showEndorsements={false}
                showEndorsementCard={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
