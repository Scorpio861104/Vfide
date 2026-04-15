'use client'

import { useMemo } from 'react'
import { Footer } from '@/components/layout/Footer'
import { SurfaceCard, SectionHeading } from '@/components/ui/primitives'
import { useAccount, useReadContract } from 'wagmi'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts'
import { SeerSocialABI, SeerViewABI } from '@/lib/abis'
import { formatDistanceToNow } from 'date-fns'
import { safeBigIntToNumber, ensureArray } from '@/lib/validation'

export default function EndorsementsPage() {
  const { address } = useAccount()
  const isSeerViewAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerView)
  const isSeerSocialAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerSocial)
  const isSeerAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)

  const { data: endorsementData } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerView,
    abi: SeerViewABI,
    functionName: 'getActiveEndorsements',
    args: address ? [CONTRACT_ADDRESSES.Seer, address] : undefined,
    query: { enabled: !!address && isSeerViewAvailable && isSeerAvailable },
  })

  const { data: endorsementStats } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerSocial,
    abi: SeerSocialABI,
    functionName: 'getEndorsementStats',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isSeerSocialAvailable },
  })

  const endorsementsTuple = endorsementData as
    | readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[]]
    | undefined

  const activeEndorsements = useMemo(
    () => {
      const endorsers = ensureArray(endorsementsTuple?.[0] ? [...endorsementsTuple[0]] : null)
      const weights = ensureArray(endorsementsTuple?.[1] ? [...endorsementsTuple[1]] : null)
      const expiries = ensureArray(endorsementsTuple?.[2] ? [...endorsementsTuple[2]] : null)
      const timestamps = ensureArray(endorsementsTuple?.[3] ? [...endorsementsTuple[3]] : null)

      return endorsers.map((endorser, idx) => ({
        endorser: endorser as `0x${string}`,
        weight: safeBigIntToNumber(weights[idx] ?? 0n, 0),
        expiry: safeBigIntToNumber(expiries[idx] ?? 0n, 0) * 1000,
        timestamp: safeBigIntToNumber(timestamps[idx] ?? 0n, 0) * 1000,
      }))
    },
    [endorsementsTuple]
  )

  const stats = endorsementStats as readonly [bigint, bigint, bigint] | undefined

  return (
    <>
      
      <div className="min-h-screen bg-black text-white pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h1 className="sr-only">Endorsements</h1>
          {/* Header */}
          <SectionHeading
            badge="Trust Network"
            title="Endorsements"
            subtitle="Network of trust and reputation through peer endorsements"
          />

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { value: safeBigIntToNumber(stats?.[0], 0), label: 'Total Endorsements', color: 'red' as const },
              { value: activeEndorsements.length, label: 'Active Endorsements', color: 'cyan' as const },
              { value: safeBigIntToNumber(stats?.[1], 0), label: 'Active Bonus', color: 'amber' as const },
            ].map((stat, idx) => (
              <SurfaceCard key={stat.label} interactive className="p-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <div className={`text-2xl font-bold ${stat.color === 'red' ? 'text-red-400' : stat.color === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`}>{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              </SurfaceCard>
            ))}
          </div>

          {/* Your Endorsements Section */}
          {address && (
            <div className="mb-8 bg-blue-900/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                ✓ You are logged in as {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <p className="text-sm text-gray-400">
                Your endorsements have stronger weight and value. Build reputation by endorsing trustworthy users.
              </p>
            </div>
          )}

          {/* Endorsements List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Recent Endorsements</h2>
            
            {activeEndorsements.length === 0 && (
              <div className="text-gray-500">No active endorsements yet. Ask trusted peers to endorse you.</div>
            )}

            {activeEndorsements.map((endorsement, index) => (
              <motion.div
                key={`${endorsement.endorser}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Endorser */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">FROM</div>
                    <Link 
                      href={`/explorer/${endorsement.endorser}`}
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      {endorsement.endorser.slice(0, 6)}...
                    </Link>
                    <div className="text-xs text-gray-600 font-mono">
                      Weight +{endorsement.weight}
                    </div>
                  </div>

                  {/* Reason & Time */}
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500 mb-1">TIMING</div>
                    <div className="text-sm text-gray-200">
                      Issued {formatDistanceToNow(new Date(endorsement.timestamp), { addSuffix: true })}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Expires {formatDistanceToNow(new Date(endorsement.expiry), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty state hint */}
          <div className="text-center text-gray-500 py-8">
            <p>Want to see more endorsements? Visit user profiles to give endorsements.</p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
