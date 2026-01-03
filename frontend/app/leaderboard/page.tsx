'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { ActivityFeed } from '@/components/gamification/ActivityFeed'
import { SurfaceCard, AccentBadge, SectionHeading } from '@/components/ui/primitives'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { 
  Trophy, 
  Medal, 
  Crown, 
  TrendingUp, 
  Users, 
  Star,
  Shield,
  ChevronUp,
  ChevronDown,
  Minus,
  Activity
} from 'lucide-react'

// Minimal ABI extension to fetch batch scores from Seer
const SEER_BATCH_ABI = [
  { name: 'getScores', type: 'function', stateMutability: 'view', inputs: [{ name: 'subjects', type: 'address[]' }], outputs: [{ type: 'uint16[]' }] },
] as const;

const tierColors: Record<string, { gradient: string; text: string; glow: string; bg: string; border: string }> = {
  'CHAMPION': { gradient: 'from-[#FFD700] to-[#FFA500]', text: 'text-[#FFD700]', glow: 'shadow-[#FFD700]/30', bg: 'bg-[#FFD700]/20', border: 'border-[#FFD700]/30' },
  'GUARDIAN': { gradient: 'from-[#C0C0C0] to-[#A0A0A0]', text: 'text-[#C0C0C0]', glow: 'shadow-[#C0C0C0]/30', bg: 'bg-[#C0C0C0]/20', border: 'border-[#C0C0C0]/30' },
  'DELEGATE': { gradient: 'from-[#CD7F32] to-[#8B4513]', text: 'text-[#CD7F32]', glow: 'shadow-[#CD7F32]/30', bg: 'bg-[#CD7F32]/20', border: 'border-[#CD7F32]/30' },
  'ADVOCATE': { gradient: 'from-[#00F0FF] to-[#00A8B5]', text: 'text-[#00F0FF]', glow: 'shadow-[#00F0FF]/30', bg: 'bg-[#00F0FF]/20', border: 'border-[#00F0FF]/30' },
  'MERCHANT': { gradient: 'from-[#50C878] to-[#3DA55D]', text: 'text-[#50C878]', glow: 'shadow-[#50C878]/30', bg: 'bg-[#50C878]/20', border: 'border-[#50C878]/30' },
  'NEUTRAL': { gradient: 'from-[#A0A0A5] to-[#6A6A6F]', text: 'text-[#A0A0A5]', glow: 'shadow-[#A0A0A5]/30', bg: 'bg-[#A0A0A5]/20', border: 'border-[#A0A0A5]/30' },
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-[#FFD700]" />
  if (rank === 2) return <Medal className="w-6 h-6 text-[#C0C0C0]" />
  if (rank === 3) return <Medal className="w-6 h-6 text-[#CD7F32]" />
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-[#A0A0A5]">{rank}</span>
}

const getChangeIndicator = (change: number) => {
  if (change > 0) {
    return (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 text-[#50C878] text-sm font-bold"
      >
        <ChevronUp size={16} strokeWidth={3} />
        <span>{change}</span>
      </motion.div>
    )
  }
  if (change < 0) {
    return (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 text-[#FF4444] text-sm font-bold"
      >
        <ChevronDown size={16} strokeWidth={3} />
        <span>{Math.abs(change)}</span>
      </motion.div>
    )
  }
  return <Minus className="w-4 h-4 text-[#6A6A6F]" />
}

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all')

  const configuredAddresses = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESSES || ''
    return raw
      .split(',')
      .map((a) => a.trim())
      .filter((a): a is `0x${string}` => a.startsWith('0x') && a.length === 42)
  }, [])

  const { data: scoreData } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_BATCH_ABI,
    functionName: 'getScores',
    args: [configuredAddresses],
    query: { enabled: configuredAddresses.length },
  })

  const leaderboard = useMemo(() => {
    if (!configuredAddresses.length) return [] as { rank: number; address: `0x${string}`; score: number; tier: string; change: number; badges: number; xp: number; level: number }[]
    const scores = scoreData ?? []
    const entries = configuredAddresses.map((addr, idx) => {
      const score = Number(scores[idx] ?? 0)
      // Estimate XP from score (simplified: 1 point = 1 XP)
      const xp = Math.max(0, (score - 540) * 10)
      const level = Math.floor(xp / 100)
      return {
        rank: idx + 1,
        address: addr,
        score,
        tier: 'NEUTRAL',
        change: 0,
        badges: 0,
        xp,
        level,
      }
    })
    return entries
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }))
  }, [configuredAddresses, scoreData])

  const totalParticipants = leaderboard.length
  const avgScore = totalParticipants
    ? Math.round(leaderboard.reduce((acc, cur) => acc + cur.score, 0) / totalParticipants)
    : 0
  const topScore = leaderboard[0]?.score || 0

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-5xl">
            <SectionHeading
              badge="Top Contributors"
              badgeIcon={<Trophy className="w-4 h-4" />}
              title="ProofScore Leaderboard"
              subtitle="Top contributors in the VFIDE ecosystem"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: Users, label: 'Total Participants', value: totalParticipants.toLocaleString(), color: 'cyan' as const },
                { icon: TrendingUp, label: 'Average Score', value: avgScore.toLocaleString(), color: 'emerald' as const },
                { icon: Crown, label: 'Top Score', value: topScore.toLocaleString(), color: 'amber' as const },
              ].map((stat, idx) => (
                <SurfaceCard key={idx} className="p-4 text-center">
                  <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color === 'cyan' ? 'text-cyan-400' : stat.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </SurfaceCard>
              ))}
            </div>
          </div>
        </section>

        {/* Timeframe Filter */}
        <section className="py-4 bg-[#1A1A1D] border-b border-[#3A3A3F] sticky top-20 z-40">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex gap-2">
              {(['all', 'month', 'week'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    timeframe === tf
                      ? 'bg-[#00F0FF] text-[#1A1A1D]'
                      : 'bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#F5F3E8]'
                  }`}
                >
                  {tf === 'all' ? 'All Time' : tf === 'month' ? 'This Month' : 'This Week'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Leaderboard Table */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-5xl">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#2A2A2F] border-2 border-[#C0C0C0] rounded-xl p-3 md:p-4 text-center mt-4 md:mt-8"
              >
                <Medal className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-[#C0C0C0]" />
                <div className="text-2xl md:text-3xl font-bold text-[#F5F3E8] mb-1">2nd</div>
                <div className="font-mono text-xs md:text-sm text-[#A0A0A5] truncate">{leaderboard[1]?.address.slice(0, 6)}...</div>
                <div className="text-lg md:text-xl font-bold text-[#C0C0C0] mt-2">{leaderboard[1]?.score.toLocaleString() || '0'}</div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20 border-2 border-[#FFD700] rounded-xl p-4 md:p-6 text-center -mt-2 md:-mt-4"
              >
                <Crown className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-[#FFD700]" />
                <div className="text-3xl md:text-4xl font-bold text-[#FFD700] mb-1">1st</div>
                <div className="font-mono text-xs md:text-sm text-[#A0A0A5] truncate">{leaderboard[0]?.address.slice(0, 6)}...</div>
                <div className="text-xl md:text-2xl font-bold text-[#FFD700] mt-2">{leaderboard[0]?.score.toLocaleString() || '0'}</div>
                <div className="hidden md:flex items-center justify-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs text-[#A0A0A5]">{leaderboard[0]?.badges ?? 0} badges</span>
                </div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#2A2A2F] border-2 border-[#CD7F32] rounded-xl p-3 md:p-4 text-center mt-4 md:mt-8"
              >
                <Medal className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-[#CD7F32]" />
                <div className="text-2xl md:text-3xl font-bold text-[#F5F3E8] mb-1">3rd</div>
                <div className="font-mono text-xs md:text-sm text-[#A0A0A5] truncate">{leaderboard[2]?.address.slice(0, 6)}...</div>
                <div className="text-lg md:text-xl font-bold text-[#CD7F32] mt-2">{leaderboard[2]?.score.toLocaleString() || '0'}</div>
              </motion.div>
            </div>

            {/* Full Leaderboard */}
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl overflow-hidden overflow-x-auto">
              {/* Table Header - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-[#1A1A1D] border-b border-[#3A3A3F] text-sm text-[#A0A0A5] font-bold">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Address</div>
                <div className="col-span-1 text-center">Level</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-1 text-center">Tier</div>
                <div className="col-span-1 text-center">Badges</div>
                <div className="col-span-1 text-center">XP</div>
                <div className="col-span-1 text-center">Change</div>
              </div>

              {/* Table Body */}
              {leaderboard.map((entry, index) => {
                const tierStyle = tierColors[entry.tier] || tierColors['NEUTRAL']
                return (
                  <motion.div
                    key={entry.address}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-[#3A3A3F] hover:bg-[#3A3A3F]/30 transition-colors ${
                      entry.rank <= 3 ? 'bg-[#FFD700]/5' : ''
                    }`}
                  >
                    {/* Mobile Layout */}
                    <Link href={`/explorer/${entry.address}`} className="md:hidden flex items-center justify-between px-3 py-3 hover:bg-[#3A3A3F]/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8">{getRankIcon(entry.rank)}</div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[#F5F3E8] text-sm">
                            {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                          </span>
                          <span className={`text-xs font-bold ${tierStyle.text}`}>{entry.tier}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#00F0FF] font-bold">{entry.score.toLocaleString()}</span>
                        {getChangeIndicator(entry.change)}
                      </div>
                    </Link>

                    {/* Desktop Layout */}
                    <Link href={`/explorer/${entry.address}`} className="hidden md:grid grid-cols-12 gap-4 px-4 py-4 hover:bg-[#3A3A3F]/50 transition-colors">
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="col-span-4 flex items-center">
                        <span className="font-mono text-[#F5F3E8] text-sm truncate">
                          {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/30">
                          <Star className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400 font-bold text-sm">{entry.level}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-[#00F0FF] font-bold">{entry.score.toLocaleString()}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                          {entry.tier}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <Shield className="w-4 h-4 text-[#A0A0A5]" />
                        <span className="text-[#F5F3E8]">{entry.badges}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-[#00F0FF] text-sm font-medium">{entry.xp.toLocaleString()}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {getChangeIndicator(entry.change)}
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {/* Load More */}
            <div className="text-center mt-6">
              <button className="px-6 py-3 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:border-[#00F0FF] transition-colors font-bold">
                Load More
              </button>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="py-8 border-t border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-[#00F0FF]" />
              <h3 className="text-2xl font-bold text-[#F5F3E8]">Recent Activity</h3>
            </div>
            <ActivityFeed limit={10} />
          </div>
        </section>

        {/* How to Climb */}
        <section className="py-8 border-t border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00F0FF]" />
                How to Climb the Leaderboard
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[#00F0FF] font-bold">+50-500</span>
                    <span className="text-[#A0A0A5]">Participate in governance votes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#50C878] font-bold">+100</span>
                    <span className="text-[#A0A0A5]">Receive peer endorsements</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#FFD700] font-bold">+200</span>
                    <span className="text-[#A0A0A5]">Mentor new users</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[#00F0FF] font-bold">+50</span>
                    <span className="text-[#A0A0A5]">Complete daily active use</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#50C878] font-bold">+25</span>
                    <span className="text-[#A0A0A5]">Per verified transaction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#FFD700] font-bold">+500</span>
                    <span className="text-[#A0A0A5]">Badge achievements</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
