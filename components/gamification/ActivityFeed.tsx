'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

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

  const activities = useMemo<ActivityItem[]>(() => {
    return ([] as ActivityItem[]).slice(0, limit)
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

      {activities.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <p>No recent activity</p>
        </div>
      )}
    </div>
  )
}
