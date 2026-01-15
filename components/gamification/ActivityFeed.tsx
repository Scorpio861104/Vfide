'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Award, TrendingUp, Users, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  const [baseNow] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  const activities = useMemo<ActivityItem[]>(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'badge_earned',
        user: '0x1234...5678',
        details: 'earned Pioneer badge',
        timestamp: baseNow - 1000 * 60 * 5,
        icon: <Award className="w-4 h-4" />,
        color: 'text-amber-400',
      },
      {
        id: '2',
        type: 'level_up',
        user: '0xabcd...ef01',
        details: 'reached Level 10',
        timestamp: baseNow - 1000 * 60 * 12,
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'text-cyan-400',
      },
      {
        id: '3',
        type: 'badge_earned',
        user: '0x9876...4321',
        details: 'earned Active Trader badge',
        timestamp: baseNow - 1000 * 60 * 18,
        icon: <Award className="w-4 h-4" />,
        color: 'text-emerald-400',
      },
      {
        id: '4',
        type: 'leaderboard_climb',
        user: '0x5555...6666',
        details: 'moved up 5 ranks to #12',
        timestamp: baseNow - 1000 * 60 * 25,
        icon: <Users className="w-4 h-4" />,
        color: 'text-purple-400',
      },
      {
        id: '5',
        type: 'xp_gained',
        user: '0x7777...8888',
        details: 'gained 50 XP',
        timestamp: baseNow - 1000 * 60 * 30,
        icon: <Zap className="w-4 h-4" />,
        color: 'text-blue-400',
      },
    ]
    return mockActivities.slice(0, limit)
  }, [baseNow, limit])

  useEffect(() => {
    // Update every 60 seconds instead of 30 to reduce unnecessary re-renders
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Memoize formatTime function to avoid recreation on every render
  const formatTime = useCallback((timestamp: number) => {
    const diff = now - timestamp
    const minutes = Math.floor(diff / 1000 / 60)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }, [now])

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

      {activities.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <p>No recent activity</p>
        </div>
      )}
    </div>
  )
}
