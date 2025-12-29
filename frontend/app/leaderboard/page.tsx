'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { GlassCard } from '@/components/ui/PageLayout'
import { Badge } from '@/components/ui/FormElements'
import { Counter } from '@/components/ui/Animations'
import { useState } from 'react'
import { motion } from 'framer-motion'
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
  Sparkles,
  Award
} from 'lucide-react'

// Mock leaderboard data - in production this would come from contract events or indexer
const mockLeaderboard = [
  { rank: 1, address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8bEb1', score: 8500, tier: 'CHAMPION', change: 2, badges: 12 },
  { rank: 2, address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', score: 8350, tier: 'CHAMPION', change: -1, badges: 10 },
  { rank: 3, address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', score: 8200, tier: 'CHAMPION', change: 0, badges: 11 },
  { rank: 4, address: '0x1234567890123456789012345678901234567890', score: 7890, tier: 'GUARDIAN', change: 3, badges: 9 },
  { rank: 5, address: '0xDead000000000000000000000000000000000000', score: 7650, tier: 'GUARDIAN', change: -2, badges: 8 },
  { rank: 6, address: '0xBeeF000000000000000000000000000000000000', score: 7400, tier: 'GUARDIAN', change: 1, badges: 8 },
  { rank: 7, address: '0xCafe000000000000000000000000000000000000', score: 7100, tier: 'DELEGATE', change: 0, badges: 7 },
  { rank: 8, address: '0xFeed000000000000000000000000000000000000', score: 6950, tier: 'DELEGATE', change: 4, badges: 6 },
  { rank: 9, address: '0xBabe000000000000000000000000000000000000', score: 6800, tier: 'DELEGATE', change: -1, badges: 7 },
  { rank: 10, address: '0xFace000000000000000000000000000000000000', score: 6650, tier: 'DELEGATE', change: 0, badges: 5 },
  { rank: 11, address: '0xAce0000000000000000000000000000000000000', score: 6500, tier: 'ADVOCATE', change: 2, badges: 5 },
  { rank: 12, address: '0xBed0000000000000000000000000000000000000', score: 6350, tier: 'ADVOCATE', change: -3, badges: 4 },
  { rank: 13, address: '0xDad0000000000000000000000000000000000000', score: 6200, tier: 'ADVOCATE', change: 1, badges: 4 },
  { rank: 14, address: '0xEgg0000000000000000000000000000000000000', score: 6050, tier: 'ADVOCATE', change: 0, badges: 3 },
  { rank: 15, address: '0xFog0000000000000000000000000000000000000', score: 5900, tier: 'MERCHANT', change: 5, badges: 3 },
]

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

  // Stats
  const totalParticipants = 12847
  const avgScore = 5420
  const topScore = mockLeaderboard[0]?.score || 0

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
                ProofScore Leaderboard
              </h1>
              <p className="text-xl text-[#A0A0A5] font-[family-name:var(--font-body)]">
                Top contributors in the VFIDE ecosystem
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-[#00F0FF]" />
                <div className="text-2xl font-bold text-[#F5F3E8]">{totalParticipants.toLocaleString()}</div>
                <div className="text-sm text-[#A0A0A5]">Total Participants</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[#50C878]" />
                <div className="text-2xl font-bold text-[#F5F3E8]">{avgScore.toLocaleString()}</div>
                <div className="text-sm text-[#A0A0A5]">Average Score</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <Crown className="w-6 h-6 mx-auto mb-2 text-[#FFD700]" />
                <div className="text-2xl font-bold text-[#FFD700]">{topScore.toLocaleString()}</div>
                <div className="text-sm text-[#A0A0A5]">Top Score</div>
              </div>
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
                <div className="font-mono text-xs md:text-sm text-[#A0A0A5] truncate">{mockLeaderboard[1]?.address.slice(0, 6)}...</div>
                <div className="text-lg md:text-xl font-bold text-[#C0C0C0] mt-2">{mockLeaderboard[1]?.score.toLocaleString()}</div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20 border-2 border-[#FFD700] rounded-xl p-4 md:p-6 text-center -mt-2 md:-mt-4"
              >
                <Crown className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-[#FFD700]" />
                <div className="text-3xl md:text-4xl font-bold text-[#FFD700] mb-1">1st</div>
                <div className="font-mono text-xs md:text-sm text-[#A0A0A5] truncate">{mockLeaderboard[0]?.address.slice(0, 6)}...</div>
                <div className="text-xl md:text-2xl font-bold text-[#FFD700] mt-2">{mockLeaderboard[0]?.score.toLocaleString()}</div>
                <div className="hidden md:flex items-center justify-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs text-[#A0A0A5]">{mockLeaderboard[0]?.badges} badges</span>
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
                <div className="font-mono text-xs md:text-sm text-[#A0A0A5] truncate">{mockLeaderboard[2]?.address.slice(0, 6)}...</div>
                <div className="text-lg md:text-xl font-bold text-[#CD7F32] mt-2">{mockLeaderboard[2]?.score.toLocaleString()}</div>
              </motion.div>
            </div>

            {/* Full Leaderboard */}
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl overflow-hidden overflow-x-auto">
              {/* Table Header - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-[#1A1A1D] border-b border-[#3A3A3F] text-sm text-[#A0A0A5] font-bold">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Address</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Tier</div>
                <div className="col-span-1 text-center">Badges</div>
                <div className="col-span-1 text-center">Change</div>
              </div>

              {/* Table Body */}
              {mockLeaderboard.map((entry, index) => {
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
                    <div className="md:hidden flex items-center justify-between px-3 py-3">
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
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-4">
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="col-span-5 flex items-center">
                        <span className="font-mono text-[#F5F3E8] text-sm truncate">
                          {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-[#00F0FF] font-bold">{entry.score.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                          {entry.tier}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <Shield className="w-4 h-4 text-[#A0A0A5]" />
                        <span className="text-[#F5F3E8]">{entry.badges}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {getChangeIndicator(entry.change)}
                      </div>
                    </div>
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
