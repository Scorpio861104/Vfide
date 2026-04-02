'use client'

import { Footer } from '@/components/layout/Footer'
import { useState } from 'react'
import { useLeaderboard, useUserRank } from '@/hooks/useLeaderboard'
import { LeaderboardHeader } from './components/LeaderboardHeader'
import { LeaderboardTable, HowToClimb } from './components/LeaderboardTable'

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all')
  const { entries, isLoading, error, totalParticipants, refetch } = useLeaderboard(50)
  const { rank: userRank } = useUserRank()

  const avgScore = entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
    : 0
  const topScore = entries[0]?.score || 0

  return (
    <>
      <main className="min-h-screen bg-zinc-900 pt-20">
        <LeaderboardHeader
          totalParticipants={totalParticipants}
          avgScore={avgScore}
          topScore={topScore}
          userRank={userRank}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          isLoading={isLoading}
          onRefetch={refetch}
        />
        <LeaderboardTable
          entries={entries}
          isLoading={isLoading}
          error={error}
          onRefetch={refetch}
        />
        <HowToClimb />
      </main>
      <Footer />
    </>
  )
}
