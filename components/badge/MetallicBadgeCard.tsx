'use client'

/**
 * Metallic Badge Card - Premium badge visualization with metallic finish and glowing runes
 * Features:
 * - Rarity-based metal textures (bronze, silver, gold, platinum, mythril, legendary)
 * - Animated glowing runic inscriptions
 * - Color-coded glow effects
 * - 3D depth effects with CSS transforms
 * - Particle animation for earned badges
 * - Hover interactions
 * - Special unlock animations
 */

import { BadgeMetadata } from '@/lib/badge-registry'
import { EligibilityResult } from '@/lib/badge-eligibility'
import { motion } from 'framer-motion'
import { Award, Lock, Sparkles } from 'lucide-react'

interface MetallicBadgeCardProps {
  badge: BadgeMetadata
  eligibility?: EligibilityResult
  isEarned?: boolean
  onClaim?: () => void
  isClaiming?: boolean
}

const rarityStyles = {
  Common: {
    metal: 'from-amber-700 via-amber-600 to-amber-800',
    glow: 'shadow-[0_0_20px_rgba(217,119,6,0.5),0_0_40px_rgba(217,119,6,0.3),inset_0_0_20px_rgba(217,119,6,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(217,119,6,0.7),0_0_60px_rgba(217,119,6,0.5),inset_0_0_30px_rgba(217,119,6,0.3)]',
    border: 'border-amber-600',
    text: 'text-amber-400',
    runeColor: '#d97706',
  },
  Uncommon: {
    metal: 'from-slate-400 via-slate-300 to-slate-500',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5),0_0_40px_rgba(59,130,246,0.3),inset_0_0_20px_rgba(59,130,246,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.7),0_0_60px_rgba(59,130,246,0.5),inset_0_0_30px_rgba(59,130,246,0.3)]',
    border: 'border-blue-500',
    text: 'text-blue-400',
    runeColor: '#3b82f6',
  },
  Rare: {
    metal: 'from-yellow-500 via-yellow-400 to-yellow-600',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5),0_0_40px_rgba(168,85,247,0.3),inset_0_0_20px_rgba(168,85,247,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.7),0_0_60px_rgba(168,85,247,0.5),inset_0_0_30px_rgba(168,85,247,0.3)]',
    border: 'border-purple-500',
    text: 'text-purple-400',
    runeColor: '#a855f7',
  },
  Epic: {
    metal: 'from-cyan-400 via-cyan-300 to-cyan-500',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.5),0_0_40px_rgba(6,182,212,0.3),inset_0_0_20px_rgba(6,182,212,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.7),0_0_60px_rgba(6,182,212,0.5),inset_0_0_30px_rgba(6,182,212,0.3)]',
    border: 'border-cyan-500',
    text: 'text-cyan-400',
    runeColor: '#06b6d4',
  },
  Legendary: {
    metal: 'from-rose-600 via-rose-500 to-rose-700',
    glow: 'shadow-[0_0_20px_rgba(225,29,72,0.5),0_0_40px_rgba(225,29,72,0.3),inset_0_0_20px_rgba(225,29,72,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(225,29,72,0.7),0_0_60px_rgba(225,29,72,0.5),inset_0_0_30px_rgba(225,29,72,0.3)]',
    border: 'border-rose-600',
    text: 'text-rose-400',
    runeColor: '#e11d48',
  },
  Mythic: {
    metal: 'from-purple-600 via-pink-500 to-orange-500',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5),0_0_40px_rgba(236,72,153,0.4),0_0_60px_rgba(249,115,22,0.3),inset_0_0_20px_rgba(168,85,247,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.7),0_0_60px_rgba(236,72,153,0.6),0_0_90px_rgba(249,115,22,0.5),inset_0_0_30px_rgba(168,85,247,0.3)]',
    border: 'border-purple-500',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400',
    runeColor: '#a855f7',
  },
}

export function MetallicBadgeCard({ 
  badge, 
  eligibility, 
  isEarned = false,
  onClaim,
  isClaiming = false,
}: MetallicBadgeCardProps) {
  const style = rarityStyles[badge.rarity]
  const isLocked = !isEarned && (!eligibility || !eligibility.eligible)
  const isClaimable = !isEarned && eligibility?.eligible
  const progress = eligibility?.progress || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.05, 
        rotateY: 5,
        transition: { duration: 0.3 }
      }}
      className="relative group"
    >
      {/* Metallic Badge Card */}
      <div
        className={`
          relative overflow-hidden rounded-xl border-2 ${style.border}
          bg-gradient-to-br ${style.metal}
          ${style.glow} ${style.hoverGlow}
          transition-all duration-300
          ${isLocked ? 'opacity-60 grayscale' : ''}
          backdrop-blur-sm
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'perspective(1000px)',
        }}
      >
        {/* Runic Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${style.runeColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Glowing Rune Border Animation */}
        {!isLocked && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              border: `1px solid ${style.runeColor}`,
              opacity: 0.3,
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Particle Effects for Earned Badges */}
        {isEarned && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{ backgroundColor: style.runeColor }}
                initial={{
                  x: '50%',
                  y: '50%',
                  opacity: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>
        )}

        {/* Card Content */}
        <div className="relative p-6 space-y-4">
          {/* Badge Icon with 3D Effect */}
          <div className="flex justify-center">
            <motion.div
              className="text-6xl filter drop-shadow-2xl"
              style={{
                textShadow: `0 0 20px ${style.runeColor}, 0 0 40px ${style.runeColor}`,
              }}
              whileHover={{
                scale: 1.1,
                rotateZ: 360,
                transition: { duration: 0.6 },
              }}
            >
              {badge.icon}
            </motion.div>
          </div>

          {/* Badge Info */}
          <div className="text-center space-y-2">
            <h3 className={`text-xl font-bold ${style.text} drop-shadow-lg`}>
              {badge.displayName}
            </h3>
            
            <p className="text-xs text-white/80 font-medium bg-black/30 rounded-full px-3 py-1 inline-block">
              {badge.rarity} • {badge.points} pts
            </p>

            <p className="text-sm text-white/70 min-h-[3rem]">
              {badge.description}
            </p>
          </div>

          {/* Progress Bar for In-Progress Badges */}
          {!isEarned && !isLocked && progress > 0 && progress < 100 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${style.metal}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex justify-center">
            {isEarned ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold bg-emerald-950/50 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4" />
                Earned
              </div>
            ) : isClaimable ? (
              <button
                onClick={onClaim}
                disabled={isClaiming}
                className={`
                  flex items-center gap-2 ${style.text} text-sm font-semibold
                  bg-black/40 hover:bg-black/60 rounded-full px-4 py-2
                  transition-all duration-200
                  ${isClaiming ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                `}
              >
                <Award className="w-4 h-4" />
                {isClaiming ? 'Claiming...' : 'Claim Badge'}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold bg-black/40 rounded-full px-4 py-2">
                <Lock className="w-4 h-4" />
                Locked
              </div>
            )}
          </div>

          {/* Requirements */}
          {eligibility && !isEarned && (
            <div className="text-xs text-white/60 space-y-1 bg-black/30 rounded-lg p-3">
              <p className="font-semibold text-white/80">Requirements:</p>
              {eligibility.requirementsMet.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-emerald-400">
                  {eligibility.requirementsMet.map((req, i) => (
                    <li key={i}>✓ {req}</li>
                  ))}
                </ul>
              )}
              {eligibility.requirementsPending.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5">
                  {eligibility.requirementsPending.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* 3D Metallic Shine Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </motion.div>
  )
}
