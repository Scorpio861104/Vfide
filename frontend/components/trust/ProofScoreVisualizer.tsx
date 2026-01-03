/**
 * Live ProofScore Visualization Component
 * MIND-BLOWING animated reputation display
 */

'use client'

import { useProofScore, useBadgeNFTs, useScoreBreakdown } from '@/lib/vfide-hooks'
import { getBadgeById } from '@/lib/badge-registry'
import { motion, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BadgeDisplay } from '../badge/BadgeDisplay'
import { EndorsementStats } from './EndorsementStats'
import { EndorsementCard } from './EndorsementCard'

interface ProofScoreVisualizerProps {
  address?: `0x${string}`
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
  showBadges?: boolean
  showBreakdown?: boolean
  showEndorsements?: boolean
  showEndorsementCard?: boolean
}

export function ProofScoreVisualizer({ 
  address, 
  size = 'medium',
  showDetails = true,
  showBadges = true,
  showBreakdown = false,
  showEndorsements = true,
  showEndorsementCard = false,
}: ProofScoreVisualizerProps) {
  const { score, tier, burnFee, color, canVote, canMerchant, isElite, isLoading } = useProofScore(address)
  const { tokenIds } = useBadgeNFTs(address)
  const { breakdown } = useScoreBreakdown(address)
  
  // Smooth animated score counter
  const springScore = useSpring(0, { 
    stiffness: 50, 
    damping: 20,
    mass: 1 
  })
  
  const [displayScore, setDisplayScore] = useState(0)
  
  useEffect(() => {
    springScore.set(score)
    const unsubscribe = springScore.on('change', (latest) => {
      setDisplayScore(Math.round(latest))
    })
    return () => unsubscribe()
  }, [score, springScore])
  
  // Size classes
  const sizeClasses = {
    small: 'w-24 h-24 text-2xl',
    medium: 'w-32 h-32 sm:w-40 sm:h-40 text-3xl sm:text-4xl',
    large: 'w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 text-4xl sm:text-5xl md:text-6xl'
  }
  
  const detailSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  }
  
  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-transparent animate-pulse border-4 border-[#F5F3E8]/20`} />
    )
  }
  
  // Calculate circle progress (score out of 10000, 10x scale)
  const progress = (score / 10000) * 100
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference
  
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Endorsement stats - shown above when enabled */}
      {showEndorsements && (
        <EndorsementStats address={address} size={size === 'small' ? 'small' : 'medium'} />
      )}
      
      {/* Circular Score Display */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Glow effect */}
        <motion.div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full blur-2xl`}
          style={{ backgroundColor: color }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* SVG Circle Progress */}
        <svg className={sizeClasses[size]} viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
          
          {/* Score text */}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-bold"
            fill={color}
            style={{
              fontSize: size === 'small' ? '24px' : size === 'medium' ? '32px' : '48px',
              filter: `drop-shadow(0 0 4px ${color})`,
            }}
          >
            {displayScore}
          </text>
        </svg>
        
        {/* Rotating ring effect for Elite */}
        {isElite && (
          <motion.div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2`}
            style={{ borderColor: color }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>
      
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-2"
        >
          {/* Tier Badge */}
          <motion.div
            className={`inline-block px-4 py-1 rounded-full font-bold ${detailSizes[size]}`}
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `2px solid ${color}`,
              boxShadow: `0 0 20px ${color}40`,
            }}
            whileHover={{ scale: 1.05 }}
          >
            {tier}
          </motion.div>
          
          {/* Benefits */}
          <div className={`space-y-1 ${detailSizes[size]} text-[#F5F3E8]/70`}>
            <div className="flex items-center justify-center gap-2">
              <span className="opacity-60">Burn Fee:</span>
              <span style={{ color }} className="font-bold">
                {burnFee}%
              </span>
            </div>
            
            {/* Access Badges */}
            <div className="flex gap-2 justify-center flex-wrap mt-2">
              {canVote && (
                <motion.span
                  className="px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] text-xs"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  🗳️ Voting
                </motion.span>
              )}
              {canMerchant && (
                <motion.span
                  className="px-2 py-0.5 rounded bg-[#FFD700]/20 text-[#FFD700] text-xs"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Merchant
                </motion.span>
              )}
              {isElite && (
                <motion.span
                  className="px-2 py-0.5 rounded bg-[#00FF88]/20 text-[#00FF88] text-xs"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.1 }}
                >
                  Elite
                </motion.span>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Badge Display Section */}
      {showBadges && tokenIds.length && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 space-y-3"
        >
          <div className={`text-center ${detailSizes[size]} text-[#F5F3E8]/70`}>
            {tokenIds.length} Badge{tokenIds.length !== 1 ? 's' : ''} Earned
          </div>
          
          {/* Top 3 Badges */}
          <div className="flex gap-2 justify-center">
            {tokenIds.slice(0, 3).map((badgeId, idx) => {
              const badgeIdHex = `0x${BigInt(badgeId).toString(16)}` as `0x${string}`
              const badge = getBadgeById(badgeIdHex)
              if (!badge) return null
              
              return (
                <motion.div
                  key={badgeId.toString()}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                >
                  <BadgeDisplay badgeId={badgeIdHex} size="sm" />
                </motion.div>
              )
            })}
          </div>
          
          {tokenIds.length > 3 && (
            <div className={`text-center ${detailSizes[size]} text-[#F5F3E8]/50`}>
              +{tokenIds.length - 3} more
            </div>
          )}
        </motion.div>
      )}
      
      {/* Score Breakdown Section */}
      {showBreakdown && breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 p-4 rounded-lg bg-[#0F0F0F]/50 backdrop-blur-xl border border-[#F5F3E8]/10 w-full max-w-md"
        >
          <div className={`font-bold mb-3 ${detailSizes[size]}`}>Score Breakdown</div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#F5F3E8]/70">Base Score:</span>
              <span style={{ color }}>{breakdown.baseScore}</span>
            </div>
            
            {breakdown.vaultBonus > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Vault Bonus:</span>
                <span style={{ color }}>+{breakdown.vaultBonus}</span>
              </div>
            )}
            
            {breakdown.ageBonus > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Age Bonus:</span>
                <span style={{ color }}>+{breakdown.ageBonus}</span>
              </div>
            )}
            
            {breakdown.activityPoints > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Activity Points:</span>
                <span style={{ color }}>+{breakdown.activityPoints}</span>
              </div>
            )}
            
            {breakdown.endorsementPoints > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Endorsement Points:</span>
                <span style={{ color }}>+{breakdown.endorsementPoints}</span>
              </div>
            )}
            
            {breakdown.badgePoints > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Badge Points:</span>
                <span style={{ color }}>+{breakdown.badgePoints}</span>
              </div>
            )}
            
            {breakdown.hasDiversityBonus && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Diversity Bonus:</span>
                <span style={{ color }}>+50</span>
              </div>
            )}
            
            {breakdown.reputationDelta !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#F5F3E8]/70">Reputation:</span>
                <span style={{ color: breakdown.reputationDelta > 0 ? '#00FF88' : '#FF4444' }}>
                  {breakdown.reputationDelta > 0 ? '+' : ''}{breakdown.reputationDelta}
                </span>
              </div>
            )}
            
            <div className="pt-2 mt-2 border-t border-[#F5F3E8]/10 flex items-center justify-between font-bold">
              <span>Total:</span>
              <span style={{ color }}>{breakdown.totalScore}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Endorsement Card - shown in profile/detailed view */}
      {showEndorsementCard && address && (
        <EndorsementCard 
          targetAddress={address} 
          endorserScore={score}
        />
      )}
    </div>
  )
}
