/**
 * Live Activity Feed - Real-time blockchain events
 * Particle effects for each transaction type
 */

'use client'

import { useActivityFeed, ActivityItem } from '@/lib/vfide-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const activityConfig = {
  transfer: {
    icon: '💸',
    label: 'Transfer',
    color: '#00F0FF',
    description: (item: ActivityItem) => `Sent ${item.amount} VFIDE`,
  },
  merchant_payment: {
    icon: '🛒',
    label: 'Payment',
    color: '#00FF88',
    description: (item: ActivityItem) => `Paid ${item.amount} VFIDE`,
  },
  endorsement: {
    icon: '🤝',
    label: 'Endorsement',
    color: '#FFD700',
    description: () => 'Gave endorsement',
  },
  vault_created: {
    icon: '🏦',
    label: 'Vault Created',
    color: '#FF6B9D',
    description: () => 'Created new vault',
  },
  proposal_voted: {
    icon: '🗳️',
    label: 'Vote',
    color: '#A78BFA',
    description: () => 'Voted on proposal',
  },
}

export function LiveActivityFeed() {
  const { activities } = useActivityFeed()
  
  return (
    <div className="space-y-2 sm:space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-zinc-100 flex items-center gap-2">
          <motion.span
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-emerald-400 rounded-full"
          />
          Live Activity
        </h3>
        <span className="text-xs sm:text-sm text-zinc-100/50">
          {activities.length} recent
        </span>
      </div>
      
      {/* Activity List */}
      <div className="relative h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] overflow-hidden rounded-xl bg-zinc-950/50 backdrop-blur-xl border border-cyan-400/20">
        <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-[#00F0FF]/30 scrollbar-track-transparent p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-2">
          <AnimatePresence initial={false}>
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </AnimatePresence>
        </div>
        
        {/* Particle effect overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <ParticleStream />
        </div>
      </div>
    </div>
  )
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const config = activityConfig[activity.type]
  const [isHovered, setIsHovered] = useState(false)
  const [currentTime] = useState(() => Date.now())
  
  const timeAgo = () => {
    const seconds = Math.floor((currentTime - activity.timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      whileHover={{ scale: 1.02, x: 5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"
        style={{ backgroundColor: config.color }}
      />
      
      {/* Card */}
      <div
        className="relative p-2 sm:p-3 rounded-lg backdrop-blur-xl transition-all border"
        style={{
          backgroundColor: `${config.color}10`,
          borderColor: isHovered ? config.color : `${config.color}30`,
        }}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Icon */}
          <motion.div
            className="text-lg sm:text-xl md:text-2xl shrink-0"
            animate={{
              scale: isHovered ? [1, 1.2, 1] : 1,
              rotate: isHovered ? [0, 10, -10, 0] : 0,
            }}
            transition={{ duration: 0.5 }}
          >
            {config.icon}
          </motion.div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span
                className="text-[10px] sm:text-xs font-bold"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-100/40">
                {timeAgo()}
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-zinc-100/80 mt-0.5 sm:mt-1 truncate">
              {config.description(activity)}
            </p>
            
            {activity.from && (
              <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2 text-[10px] sm:text-xs">
                <span className="text-zinc-100/50">From:</span>
                <code className="text-cyan-400 font-mono truncate">
                  {activity.from.slice(0, 6)}...{activity.from.slice(-4)}
                </code>
              </div>
            )}
            
            {activity.txHash && isHovered && (
              <motion.a
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                href={`https://sepolia.basescan.org/tx/${activity.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-400 mt-2 inline-flex items-center gap-1 transition-colors"
              >
                View on Explorer →
              </motion.a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ParticleStream() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number }>>([])
  
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => [
        ...prev.slice(-20), // Keep last 20
        {
          id: Date.now(),
          left: Math.random() * 100,
        },
      ])
    }, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ top: '100%', opacity: 0.6 }}
            animate={{ top: '-10%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'linear' }}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${particle.left}%`,
              boxShadow: '0 0 8px #00F0FF',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
