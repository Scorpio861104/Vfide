'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Users, Activity, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const ETHEREUM_ADDRESS_LENGTH = 42

type ExplorerActivity = {
  id: string
  type: 'payment' | 'endorsement' | 'activity'
  from?: string
  to?: string
  amount?: string
  timestamp: string
  status: string
  title: string
  description: string
}

type TopAddress = {
  address: string
  proofScore: number
  transactions: number
}

type ActivityApiItem = {
  id?: number
  activity_type?: string
  title?: string
  description?: string
  created_at?: string
  user_address?: string
  data?: unknown
}

type LeaderboardApiItem = {
  walletAddress?: string
  activityScore?: number
  stats?: {
    transactionsCount?: number
  }
}

const normalizeExplorerType = (value?: string | null): ExplorerActivity['type'] => {
  const type = value?.toLowerCase() ?? ''
  if (type.includes('endorse')) return 'endorsement'
  if (type.includes('payment') || type.includes('transaction') || type.includes('transfer')) return 'payment'
  return 'activity'
}

const safeParseData = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null
}

const formatTimeAgo = (timestamp?: string) => {
  if (!timestamp) return 'recently'
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return 'recently'
  const seconds = Math.floor((Date.now() - time) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

const parseAmount = (value?: string) => {
  if (!value) return 0
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activityItems, setActivityItems] = useState<ExplorerActivity[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [isActivityLoading, setIsActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [topAddresses, setTopAddresses] = useState<TopAddress[]>([])
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const fetchActivity = async () => {
      setIsActivityLoading(true)
      setActivityError(null)
      try {
        const response = await fetch('/api/activities?limit=50&offset=0')
        if (!response.ok) throw new Error('Failed to load activity')
        const data = await response.json()
        const mapped = Array.isArray(data.activities)
          ? data.activities.map((activity: ActivityApiItem) => {
              const metadata = safeParseData(activity.data)
              const from = (metadata?.from as string | undefined) ?? activity.user_address ?? ''
              const to = (metadata?.to as string | undefined) ?? (metadata?.recipient as string | undefined) ?? ''
              const amount = (metadata?.amount as string | undefined) ?? (metadata?.value as string | undefined) ?? ''
              const status = (metadata?.status as string | undefined) ?? 'recorded'
              const type = normalizeExplorerType(activity.activity_type)
              return {
                id: String(activity.id ?? `${activity.activity_type}-${activity.created_at}`),
                type,
                from: from || undefined,
                to: to || undefined,
                amount: amount || undefined,
                status,
                title: activity.title ?? activity.activity_type ?? 'Activity',
                description: activity.description ?? '',
                timestamp: formatTimeAgo(activity.created_at),
              }
            })
          : []

        if (isMounted) {
          setActivityItems(mapped)
          setActivityTotal(Number.isFinite(Number(data.total)) ? Number(data.total) : mapped.length)
        }
      } catch {
        if (isMounted) {
          setActivityItems([])
          setActivityTotal(0)
          setActivityError('Unable to load recent activity.')
        }
      } finally {
        if (isMounted) setIsActivityLoading(false)
      }
    }

    fetchActivity()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchLeaderboard = async () => {
      setIsLeaderboardLoading(true)
      setLeaderboardError(null)
      try {
        const response = await fetch('/api/leaderboard/monthly?limit=3')
        if (!response.ok) throw new Error('Failed to load leaderboard')
        const data = await response.json()
        const mapped = Array.isArray(data.leaderboard)
          ? data.leaderboard.map((entry: LeaderboardApiItem) => ({
              address: entry.walletAddress ?? 'Unknown',
              proofScore: Number(entry.activityScore ?? 0),
              transactions: Number(entry.stats?.transactionsCount ?? 0),
            }))
          : []

        if (isMounted) setTopAddresses(mapped)
      } catch {
        if (isMounted) {
          setTopAddresses([])
          setLeaderboardError('Unable to load top addresses.')
        }
      } finally {
        if (isMounted) setIsLeaderboardLoading(false)
      }
    }

    fetchLeaderboard()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.startsWith('0x') && searchQuery.length === ETHEREUM_ADDRESS_LENGTH) {
      router.push(`/explorer/${searchQuery}`)
    }
  }

  const recentActivity = activityItems.slice(0, 3)
  const activityStats = useMemo(() => {
    const addresses = new Set<string>()
    let totalVolume = 0

    activityItems.forEach((activity) => {
      if (activity.from) addresses.add(activity.from.toLowerCase())
      if (activity.to) addresses.add(activity.to.toLowerCase())
      totalVolume += parseAmount(activity.amount)
    })

    return {
      totalActivity: activityTotal || activityItems.length,
      activeAddresses: addresses.size,
      totalVolume: totalVolume > 0 ? totalVolume : null,
    }
  }, [activityItems, activityTotal])

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            VFIDE Explorer
          </h1>
          <p className="text-gray-400 text-lg">
            Explore transactions, addresses, and activity on the VFIDE network
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSearch}
          className="max-w-3xl mx-auto mb-12"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address (0x...)"
              className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
        </motion.form>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Activity</h3>
            </div>
            <p className="text-3xl font-bold text-white">{activityStats.totalActivity.toLocaleString()}</p>
            <p className="text-sm text-cyan-400 mt-2">Based on recent activity</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Active Addresses</h3>
            </div>
            <p className="text-3xl font-bold text-white">{activityStats.activeAddresses.toLocaleString()}</p>
            <p className="text-sm text-purple-400 mt-2">Seen in recent activity</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Volume</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {activityStats.totalVolume ? formatCurrency(activityStats.totalVolume) : '—'}
            </p>
            <p className="text-sm text-green-400 mt-2">Summed from recent activity</p>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {isActivityLoading ? (
              <div className="text-gray-400">Loading recent activity...</div>
            ) : activityError ? (
              <div className="text-red-400">{activityError}</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-gray-400">No recent activity yet.</div>
            ) : (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.type === 'payment' 
                          ? 'bg-cyan-500/20 text-cyan-400' 
                          : activity.type === 'endorsement'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-zinc-500/20 text-zinc-300'
                      }`}>
                        {activity.type}
                      </span>
                      <span className="text-xs text-gray-500">{activity.timestamp}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                      {activity.from ? (
                        <Link
                          href={`/explorer/${activity.from}`}
                          className="text-gray-400 hover:text-cyan-400 truncate max-w-[200px]"
                        >
                          {activity.from}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Unknown</span>
                      )}
                      {activity.from && activity.to ? (
                        <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />
                      ) : null}
                      {activity.to ? (
                        <Link
                          href={`/explorer/${activity.to}`}
                          className="text-gray-400 hover:text-cyan-400 truncate max-w-[200px]"
                        >
                          {activity.to}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Address unavailable</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 text-right">
                    <p className="text-lg font-bold text-white">
                      {activity.amount ? (
                        <>
                          {activity.type === 'payment' ? '$' : ''}
                          {activity.amount}
                          {activity.type === 'endorsement' ? ' ProofScore' : ''}
                        </>
                      ) : (
                        activity.title
                      )}
                    </p>
                    <p className="text-xs text-green-400 capitalize">{activity.status}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Top Addresses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            Top Addresses
          </h2>
          <div className="space-y-4">
            {isLeaderboardLoading ? (
              <div className="text-gray-400">Loading top addresses...</div>
            ) : leaderboardError ? (
              <div className="text-red-400">{leaderboardError}</div>
            ) : topAddresses.length === 0 ? (
              <div className="text-gray-400">No leaderboard data available.</div>
            ) : (
              topAddresses.map((addr, index) => (
                <motion.div
                  key={`${addr.address}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-500">#{index + 1}</div>
                    {addr.address.startsWith('0x') && addr.address.length === ETHEREUM_ADDRESS_LENGTH ? (
                      <Link
                        href={`/explorer/${addr.address}`}
                        className="text-cyan-400 hover:text-cyan-300 truncate max-w-[300px]"
                      >
                        {addr.address}
                      </Link>
                    ) : (
                      <span className="text-gray-400 truncate max-w-[300px]">{addr.address}</span>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-gray-500">ProofScore</p>
                      <p className="font-bold text-white">{addr.proofScore}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Transactions</p>
                      <p className="font-bold text-white">{addr.transactions}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
