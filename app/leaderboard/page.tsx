'use client'

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
  Award,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { useLeaderboard, useUserRank, type LeaderboardEntry } from '@/hooks/useLeaderboard'

const tierColors: Record<string, { gradient: string; text: string; glow: string; bg: string; border: string }> = {
  'CHAMPION': { gradient: 'from-amber-400 to-orange-500', text: 'text-amber-400', glow: 'shadow-amber-400/30', bg: 'bg-amber-400/20', border: 'border-amber-400/30' },
  'GUARDIAN': { gradient: 'from-[#C0C0C0] to-[#A0A0A0]', text: 'text-zinc-400', glow: 'shadow-zinc-400/30', bg: 'bg-zinc-400/20', border: 'border-zinc-400/30' },
  'DELEGATE': { gradient: 'from-[#CD7F32] to-[#8B4513]', text: 'text-amber-600', glow: 'shadow-amber-600/30', bg: 'bg-amber-600/20', border: 'border-amber-600/30' },
  'ADVOCATE': { gradient: 'from-cyan-400 to-cyan-600', text: 'text-cyan-400', glow: 'shadow-cyan-400/30', bg: 'bg-cyan-400/20', border: 'border-cyan-400/30' },
  'MERCHANT': { gradient: 'from-emerald-500 to-[#3DA55D]', text: 'text-emerald-500', glow: 'shadow-emerald-500/30', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  'NEUTRAL': { gradient: 'from-zinc-400 to-zinc-500', text: 'text-zinc-400', glow: 'shadow-zinc-400/30', bg: 'bg-zinc-400/20', border: 'border-zinc-400/30' },
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-amber-400" />
  if (rank === 2) return <Medal className="w-6 h-6 text-zinc-400" />
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-zinc-400">{rank}</span>
}

const getChangeIndicator = (change: number) => {
  if (change > 0) {
    return (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 text-emerald-500 text-sm font-bold"
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
        className="flex items-center gap-1 text-red-500 text-sm font-bold"
      >
        <ChevronDown size={16} strokeWidth={3} />
        <span>{Math.abs(change)}</span>
      </motion.div>
    )
  }
  return <Minus className="w-4 h-4 text-zinc-500" />
}

// Podium card for top 3 display
function _PodiumCard({ 
  entry, 
  place, 
  delay 
}: { 
  entry: LeaderboardEntry
  place: 1 | 2 | 3
  delay: number 
}) {
  const heights = { 1: 'h-52', 2: 'h-44', 3: 'h-40' }
  const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
  const Icon = place === 1 ? Crown : Medal

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={`relative ${place === 1 ? 'order-2 -mt-4' : place === 2 ? 'order-1 mt-8' : 'order-3 mt-8'}`}
    >
      <GlassCard 
        className={`p-6 text-center border-2 ${heights[place]}`}
        glow={colors[place]}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
          className="absolute -top-6 left-1/2 -translate-x-1/2"
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${colors[place]}40, ${colors[place]}20)`,
              boxShadow: `0 0 30px ${colors[place]}40`
            }}
          >
            <Icon className="w-6 h-6" style={{ color: colors[place] }} />
          </div>
        </motion.div>

        <div 
          className="text-4xl font-black mt-4 mb-2"
          style={{ color: colors[place] }}
        >
          {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
        </div>

        <div className="font-mono text-sm text-zinc-400 mb-3">
          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
        </div>

        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring" as const }}
          className="text-2xl font-bold mb-2"
          style={{ color: colors[place] }}
        >
          <Counter value={entry.score} />
        </motion.div>

        <div className="flex items-center justify-center gap-1 text-xs text-zinc-400">
          <Star className="w-3 h-3" style={{ color: colors[place] }} />
          <span>{entry.badges} badges</span>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// Table row for leaderboard entries
function _LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const tierStyle = tierColors[entry.tier] ?? tierColors['NEUTRAL']
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className={`
        border-b border-white/5 last:border-0
        ${entry.rank <= 3 ? 'bg-gradient-to-r from-amber-400/5 to-transparent' : ''}
      `}
    >
      <div className="md:hidden flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8">{getRankIcon(entry.rank)}</div>
          <div>
            <div className="font-mono text-sm text-zinc-100">
              {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
            </div>
            <Badge variant={entry.tier === 'CHAMPION' ? 'premium' : 'info'} size="sm">
              {entry.tier}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
          {getChangeIndicator(entry.change)}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
        <div className="col-span-1 flex items-center gap-2">
          {getRankIcon(entry.rank)}
        </div>
        
        <div className="col-span-4 flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${tierColors[entry.tier]?.gradient?.split(' ')[0]?.replace('from-[', '')?.replace(']', '') ?? '#00F0FF'}20, transparent)` }}
          >
            <Shield className={`w-5 h-5 ${tierStyle?.text ?? ''}`} />
          </div>
          <span className="font-mono text-zinc-100">
            {entry.address.slice(0, 8)}...{entry.address.slice(-6)}
          </span>
        </div>
        
        <div className="col-span-2 text-center">
          <span className="text-xl font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
        </div>
        
        <div className="col-span-2 text-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${tierStyle?.text ?? ''}`}
            style={{ background: `linear-gradient(135deg, ${tierColors[entry.tier]?.gradient?.split(' ')[0]?.replace('from-[', '')?.replace(']', '') ?? '#00F0FF'}20, transparent)` }}
          >
            <Sparkles size={12} />
            {entry.tier}
          </span>
        </div>
        
        <div className="col-span-2 flex items-center justify-center gap-2">
          <Award className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-100 font-medium">{entry.badges}</span>
        </div>
        
        <div className="col-span-1 flex justify-center">
          {getChangeIndicator(entry.change)}
        </div>
      </div>
    </motion.div>
  )
}

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all')
  
  // Fetch real leaderboard data from Seer contract
  const { entries, isLoading, error, totalParticipants, refetch } = useLeaderboard(50)
  const { rank: userRank } = useUserRank()

  // Calculate stats from real data
  const avgScore = entries.length > 0 
    ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
    : 0
  const topScore = entries[0]?.score || 0

  return (
    <>
      
        <main className="min-h-screen bg-zinc-900 pt-20">
          {/* Header */}
          <section className="py-12 bg-gradient-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700">
            <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-effect">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-(family-name:--font-display) font-bold text-zinc-100 mb-2">
                  ProofScore Leaderboard
                </h1>
                <p className="text-lg sm:text-xl text-zinc-400 font-(family-name:--font-body)">
                  Top contributors in the VFIDE ecosystem
                </p>
                <div
                  className="flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mt-4"
                  aria-label="Leaderboard progression: Compete, then Climb, then Lead"
                >
                  <span>Compete</span>
                  <span className="text-amber-400">→</span>
                  <span>Climb</span>
                  <span className="text-amber-400">→</span>
                  <span>Lead</span>
                </div>
                {userRank && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 rounded-lg px-4 py-2">
                    <span className="text-zinc-400">Your Rank:</span>
                    <span className="text-cyan-400 font-bold">#{userRank}</span>
                  </div>
                )}
              </div>

            {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center ring-effect">
                  <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                  <div className="text-2xl font-bold text-zinc-100">{totalParticipants.toLocaleString()}</div>
                  <div className="text-sm text-zinc-400">Total Participants</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center ring-effect">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                  <div className="text-2xl font-bold text-zinc-100">{avgScore.toLocaleString()}</div>
                  <div className="text-sm text-zinc-400">Average Score</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center ring-effect">
                  <Crown className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                  <div className="text-2xl font-bold text-amber-400">{topScore.toLocaleString()}</div>
                  <div className="text-sm text-zinc-400">Top Score</div>
                </div>
              </div>
            </div>
          </section>

        {/* Timeframe Filter */}
          <section className="py-4 bg-zinc-900/90 border-b border-zinc-700 sticky top-20 z-40 backdrop-blur-sm">
            <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['all', 'month', 'week'] as const).map((tf) => (
                    <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ring-effect ${
                        timeframe === tf
                          ? 'bg-cyan-400 text-zinc-900'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {tf === 'all' ? 'All Time' : tf === 'month' ? 'This Month' : 'This Week'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 hover:border-cyan-400 transition-colors disabled:opacity-50 ring-effect"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline text-sm">Refresh</span>
                </button>
              </div>
            </div>
        </section>

        {/* Leaderboard Table */}
        <section className="py-8">
          <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center mb-8">
                <p className="text-red-500 mb-4">{error.message}</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 hover:border-cyan-400"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                <p className="text-zinc-400">Loading leaderboard data...</p>
              </div>
            )}

            {/* Top 3 Podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                {/* 2nd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-zinc-800 border-2 border-zinc-400 rounded-xl p-3 md:p-4 text-center mt-4 md:mt-8"
                >
                  <Medal className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-zinc-400" />
                  <div className="text-2xl md:text-3xl font-bold text-zinc-100 mb-1">2nd</div>
                  <div className="font-mono text-xs md:text-sm text-zinc-400 truncate">{entries[1]?.address.slice(0, 6)}...</div>
                  <div className="text-lg md:text-xl font-bold text-zinc-400 mt-2">{entries[1]?.score.toLocaleString()}</div>
                </motion.div>

                {/* 1st Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-2 border-amber-400 rounded-xl p-4 md:p-6 text-center -mt-2 md:-mt-4"
                >
                  <Crown className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-amber-400" />
                  <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-1">1st</div>
                  <div className="font-mono text-xs md:text-sm text-zinc-400 truncate">{entries[0]?.address.slice(0, 6)}...</div>
                  <div className="text-xl md:text-2xl font-bold text-amber-400 mt-2">{entries[0]?.score.toLocaleString()}</div>
                  <div className="hidden md:flex items-center justify-center gap-1 mt-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-zinc-400">{entries[0]?.badges} badges</span>
                  </div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-zinc-800 border-2 border-amber-600 rounded-xl p-3 md:p-4 text-center mt-4 md:mt-8"
                >
                  <Medal className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-amber-600" />
                  <div className="text-2xl md:text-3xl font-bold text-zinc-100 mb-1">3rd</div>
                  <div className="font-mono text-xs md:text-sm text-zinc-400 truncate">{entries[2]?.address.slice(0, 6)}...</div>
                  <div className="text-lg md:text-xl font-bold text-amber-600 mt-2">{entries[2]?.score.toLocaleString()}</div>
                </motion.div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && entries.length === 0 && !error && (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-100 mb-2">No Rankings Yet</h3>
                <p className="text-zinc-400">Be the first to earn ProofScore points!</p>
              </div>
            )}

            {/* Full Leaderboard */}
            {entries.length > 0 && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden overflow-x-auto">
                {/* Table Header - Hidden on mobile */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-700 text-sm text-zinc-400 font-bold">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Address</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">Tier</div>
                  <div className="col-span-1 text-center">Badges</div>
                  <div className="col-span-1 text-center">Change</div>
                </div>

                {/* Table Body */}
                {entries.map((entry, index) => {
                  const tierStyle = (tierColors[entry.tier] || tierColors['NEUTRAL'])!
                  return (
                    <motion.div
                      key={entry.address}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-zinc-700 hover:bg-zinc-700/30 transition-colors ${
                        entry.rank <= 3 ? 'bg-amber-400/5' : ''
                      }`}
                    >
                      {/* Mobile Layout */}
                      <div className="md:hidden flex items-center justify-between px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8">{getRankIcon(entry.rank)}</div>
                          <div className="flex flex-col">
                            <span className="font-mono text-zinc-100 text-sm">
                              {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                            </span>
                            <span className={`text-xs font-bold ${tierStyle.text}`}>{entry.tier}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold">{entry.score.toLocaleString()}</span>
                          {getChangeIndicator(entry.change)}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-4">
                        <div className="col-span-1 flex items-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="col-span-5 flex items-center">
                          <span className="font-mono text-zinc-100 text-sm truncate">
                            {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="text-cyan-400 font-bold">{entry.score.toLocaleString()}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                            {entry.tier}
                          </span>
                        </div>
                        <div className="col-span-1 flex items-center justify-center gap-1">
                          <Shield className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-100">{entry.badges}</span>
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          {getChangeIndicator(entry.change)}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Load More */}
            <div className="text-center mt-6">
              <button className="px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 hover:border-cyan-400 transition-colors font-bold">
                Load More
              </button>
            </div>
          </div>
        </section>

        {/* How to Climb */}
        <section className="py-8 border-t border-zinc-700">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                How to Climb the Leaderboard
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">+50-500</span>
                    <span className="text-zinc-400">Participate in governance votes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">+100</span>
                    <span className="text-zinc-400">Receive peer endorsements</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">+200</span>
                    <span className="text-zinc-400">Mentor new users</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">+50</span>
                    <span className="text-zinc-400">Complete daily active use</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">+25</span>
                    <span className="text-zinc-400">Per verified transaction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">+500</span>
                    <span className="text-zinc-400">Badge achievements</span>
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
