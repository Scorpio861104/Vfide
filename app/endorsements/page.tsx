'use client'

export const dynamic = 'force-dynamic';

import { useMemo } from 'react'
import { Footer } from '@/components/layout/Footer'
import { useAccount, useReadContract } from 'wagmi'
import { Calendar, Users, Star, Award } from 'lucide-react'
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

  const activeEndorsements = useMemo(() => {
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
  }, [endorsementsTuple])

  const stats = endorsementStats as readonly [bigint, bigint, bigint] | undefined

  return (
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem] pb-16 text-white relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Trust Network</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-3">
              <Star size={32} className="text-cyan-400" />Endorsements
            </span>
          </h1>
          <p className="text-white/50">Network of trust and reputation through peer endorsements</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { value: safeBigIntToNumber(stats?.[0], 0), label: 'Total Endorsements', color: 'cyan', icon: Award },
            { value: activeEndorsements.length, label: 'Active Endorsements', color: 'emerald', icon: Users },
            { value: safeBigIntToNumber(stats?.[1], 0), label: 'Active Bonus', color: 'amber', icon: Star },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className="analytics-card p-5">
              <div className={`text-3xl font-bold ${stat.color === 'cyan' ? 'text-cyan-400' : stat.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Connected notice */}
        {address && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-center gap-2 text-cyan-300 mb-1 text-sm font-medium">
              ✓ Logged in as {address.slice(0, 6)}...{address.slice(-4)}
            </div>
            <p className="text-xs text-white/40">
              Your endorsements have stronger weight and value. Build reputation by endorsing trustworthy users.
            </p>
          </motion.div>
        )}

        {/* Endorsements List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-xl font-bold mb-4 text-white">Recent Endorsements</h2>

          {activeEndorsements.length === 0 && (
            <div className="glass-card-premium p-10 text-center">
              <Users size={48} className="mx-auto mb-4 text-white/20" />
              <p className="text-white/40">No active endorsements yet.</p>
              <p className="text-white/30 text-sm mt-1">Ask trusted peers to endorse you.</p>
            </div>
          )}

          <div className="space-y-3">
            {activeEndorsements.map((endorsement, index) => (
              <motion.div key={`${endorsement.endorser}-${index}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                className="glass-card-premium p-4 hover:border-white/20 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div>
                    <div className="text-xs text-white/30 mb-1 uppercase tracking-wider">FROM</div>
                    <Link href={`/explorer/${endorsement.endorser}`}
                      className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
                      {endorsement.endorser.slice(0, 6)}...
                    </Link>
                    <div className="text-xs text-white/30 font-mono mt-0.5">
                      Weight +{endorsement.weight}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-white/30 mb-1 uppercase tracking-wider">TIMING</div>
                    <div className="text-sm text-white/80">
                      Issued {formatDistanceToNow(new Date(endorsement.timestamp), { addSuffix: true })}
                    </div>
                    <div className="text-xs text-white/30 mt-1 flex items-center gap-1.5">
                      <Calendar size={11} />
                      Expires {formatDistanceToNow(new Date(endorsement.expiry), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center text-white/30 py-8 text-sm">
          Want to see more endorsements? Visit user profiles to give endorsements.
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
