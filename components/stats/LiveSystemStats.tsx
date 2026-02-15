/**
 * Live System Statistics Dashboard
 * Real-time network metrics with sparklines and trends
 */

'use client'

import { useSystemStats } from '@/lib/vfide-hooks'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState, ReactNode } from 'react'
import { Lock, Building2, Store, Zap } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  icon: ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendPercent?: number
}

function StatCard({ label, value, subValue, icon, color, trend, trendPercent }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"
        style={{ backgroundColor: color }}
      />
      
      {/* Card */}
      <div
        className="relative bg-zinc-950/80 backdrop-blur-xl rounded-xl p-3 sm:p-4 md:p-6 border transition-all duration-300"
        style={{
          borderColor: isHovered ? color : `${color}30`,
          backgroundColor: isHovered ? `${color}05` : '#0F0F0F80',
        }}
      >
        <div className="space-y-1 sm:space-y-2 md:space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs md:text-sm text-zinc-100/60 truncate pr-1">{label}</span>
            <motion.div
              className="text-lg sm:text-xl md:text-2xl shrink-0"
              animate={{
                scale: isHovered ? [1, 1.2, 1] : 1,
                rotate: isHovered ? [0, 15, 0] : 0,
              }}
              transition={{ duration: 0.5 }}
            >
              {icon}
            </motion.div>
          </div>
          
          {/* Value */}
          <div
            className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold truncate"
            style={{ color }}
          >
            {value}
          </div>
          
          {/* Sub value & Trend */}
          <div className="flex items-center justify-between">
            {subValue && (
              <span className="text-xs text-zinc-100/50">{subValue}</span>
            )}
            
            {trend && trendPercent !== undefined && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1 text-xs font-bold"
                style={{
                  color: trend === 'up' ? '#00FF88' : trend === 'down' ? '#FF4444' : '#F5F3E8',
                }}
              >
                <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
                <span>{trendPercent.toFixed(1)}%</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function LiveSystemStats() {
  const {
    vaults: totalVaults,
    merchants: totalMerchants,
    transactions24h: totalTransactions,
    tvl: totalValueLocked,
    avgProofScore,
    daoProposals,
    eliteUsers,
    volume24h,
  } = useSystemStats()
  const previousStats = useRef({
    vaults: totalVaults,
    merchants: totalMerchants,
    transactions: totalTransactions,
    tvl: totalValueLocked,
  })
  type TrendDirection = 'up' | 'down' | 'neutral'
  type TrendData = { direction: TrendDirection; percent: number }

  const [trends, setTrends] = useState<{
    vaults: TrendData;
    merchants: TrendData;
    transactions: TrendData;
    tvl: TrendData;
  }>({
    vaults: { direction: 'neutral' as const, percent: 0 },
    merchants: { direction: 'neutral' as const, percent: 0 },
    transactions: { direction: 'neutral' as const, percent: 0 },
    tvl: { direction: 'neutral' as const, percent: 0 },
  })

  useEffect(() => {
    const calcTrend = (current: number, previous: number): TrendData => {
      if (previous === 0) {
        return { direction: 'neutral' as const, percent: 0 }
      }
      const diff = current - previous
      const percent = (diff / previous) * 100
      return {
        direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        percent: Math.abs(percent),
      }
    }

    setTrends({
      vaults: calcTrend(totalVaults, previousStats.current.vaults),
      merchants: calcTrend(totalMerchants, previousStats.current.merchants),
      transactions: calcTrend(totalTransactions, previousStats.current.transactions),
      tvl: calcTrend(totalValueLocked, previousStats.current.tvl),
    })

    previousStats.current = {
      vaults: totalVaults,
      merchants: totalMerchants,
      transactions: totalTransactions,
      tvl: totalValueLocked,
    }
  }, [totalVaults, totalMerchants, totalTransactions, totalValueLocked])
  
  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="text-center space-y-1 sm:space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-100"
        >
          Network Statistics
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 text-sm text-zinc-100/60"
        >
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          Live updates every 5 seconds
        </motion.div>
        
        <StatCard
          label="Total Value Locked"
          value={`$${(totalValueLocked / 1000000).toFixed(2)}M`}
          subValue="in user vaults"
          icon={<Lock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />}
          color="#00F0FF"
          trend={trends.tvl.direction}
          trendPercent={trends.tvl.percent}
        />
        
        <StatCard
          label="Active Vaults"
          value={totalVaults.toLocaleString()}
          subValue="non-custodial"
          icon={<Building2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-pink-400" />}
          color="#FF6B9D"
          trend={trends.vaults.direction}
          trendPercent={trends.vaults.percent}
        />
        
        <StatCard
          label="Verified Merchants"
          value={totalMerchants.toLocaleString()}
          subValue="no processor fees"
          icon={<Store className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400" />}
          color="#FFD700"
          trend={trends.merchants.direction}
          trendPercent={trends.merchants.percent}
        />
        
        <StatCard
          label="Transactions"
          value={totalTransactions.toLocaleString()}
          subValue="all-time"
          icon={<Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-400" />}
          color="#00FF88"
          trend={trends.transactions.direction}
          trendPercent={trends.transactions.percent}
        />
      </div>
      
      {/* Additional Info Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zinc-950/50 backdrop-blur-xl rounded-xl p-2 sm:p-3 md:p-4 border border-cyan-400/20"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 text-center">
          <div>
            <p className="text-[10px] sm:text-xs text-zinc-100/50">Avg ProofScore</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-cyan-400">{Math.round(avgProofScore)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-zinc-100/50">DAO Proposals</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-violet-400">{daoProposals}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-zinc-100/50">Elite Users</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-emerald-400">{eliteUsers}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-zinc-100/50">24h Volume</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-amber-400">${(volume24h / 1000000).toFixed(2)}M</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
