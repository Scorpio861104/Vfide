'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Award, TrendingUp, Users, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ActivityItem {
  id: string
  type: 'badge_earned' | 'level_up' | 'xp_gained' | 'leaderboard_climb'
  user: string
  details: string
  timestamp: number
  icon: React.ReactNode
  color: string
}

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const [now, setNow] = useState(() => Date.now())
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const normalizeType = (value?: string | null): ActivityItem['type'] => {
      const type = value?.toLowerCase() ?? ''
      if (type.includes('badge')) return 'badge_earned'
      if (type.includes('level')) return 'level_up'
      if (type.includes('leaderboard')) return 'leaderboard_climb'
      if (type.includes('xp') || type.includes('point')) return 'xp_gained'
      return 'xp_gained'
    }

    const loadActivities = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/activities?limit=${limit}&offset=0`)
        if (!response.ok) throw new Error('Failed to load activity feed')
        const data = await response.json()
        const items = Array.isArray(data.activities) ? data.activities : []
        const mapped = items.map((activity: Record<string, unknown>): ActivityItem => {
          const type = normalizeType(activity.activity_type ?? activity.type) as ActivityItem['type'];
          const iconMap: Record<ActivityItem['type'], React.ReactNode> = {
            badge_earned: <Award className="w-4 h-4" />,
            level_up: <TrendingUp className="w-4 h-4" />,
            xp_gained: <Zap className="w-4 h-4" />,
            leaderboard_climb: <Users className="w-4 h-4" />,
          }
          const colorMap: Record<ActivityItem['type'], string> = {
            badge_earned: 'text-amber-400',
            level_up: 'text-cyan-400',
            xp_gained: 'text-blue-400',
            leaderboard_climb: 'text-purple-400',
          }

          return {
            id: String(activity.id ?? `${activity.activity_type}-${activity.created_at}`),
            type,
            user: typeof activity.user_address === 'string' ? activity.user_address : 
                  typeof activity.user_username === 'string' ? activity.user_username : '0x0',
            details: typeof activity.description === 'string' ? activity.description :
                    typeof activity.title === 'string' ? activity.title : 'Activity update',
            timestamp: activity.created_at ? new Date(activity.created_at as string | number | Date).getTime() : Date.now(),
            icon: iconMap[type],
            color: colorMap[type],
          }
        })

        if (isMounted) {
          setActivities(mapped)
        }
      } catch (_err) {
        if (isMounted) {
          setActivities([])
          setError('Unable to load activity feed.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadActivities()

    return () => {
      isMounted = false
    }
  }, [limit])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (timestamp: number) => {
    const diff = now - timestamp
    const minutes = Math.floor(diff / 1000 / 60)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${activity.color}`}>
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">
                <span className="font-mono text-white/60">{activity.user}</span>
                {' '}
                <span className="text-white/80">{activity.details}</span>
              </p>
              <p className="text-white/40 text-xs">{formatTime(activity.timestamp)}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (
        <div className="text-center py-8 text-white/40">
          <p>Loading activity…</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-8 text-red-400">
          <p>{error}</p>
        </div>
      )}

      {activities.length === 0 && !isLoading && !error && (
        <div className="text-center py-8 text-white/40">
          <p>No recent activity</p>
        </div>
      )}
    </div>
  )
}
