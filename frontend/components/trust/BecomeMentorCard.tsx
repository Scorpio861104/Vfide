/**
 * Become a Mentor Card - Registration interface for mentorship program
 */

'use client'

import { motion } from 'framer-motion'
import { useProofScore, useIsMentor, useBecomeMentor, useMentorInfo } from '@/lib/vfide-hooks'
import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'

export function BecomeMentorCard() {
  const { isConnected } = useAccount()
  const { score, canEndorse } = useProofScore()
  const { isMentor } = useIsMentor()
  const { canBecomeMentor, mentorEligibleAt } = useMentorInfo()
  const { becomeMentor, isLoading, isSuccess } = useBecomeMentor()
  const [showDetails, setShowDetails] = useState(false)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  // Update time every minute for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60000)
    return () => clearInterval(interval)
  }, [])

  if (!isConnected || isMentor) return null

  const meetsScoreRequirement = canEndorse // score >= 8000
  const daysUntilMentor = mentorEligibleAt ? Math.max(0, Math.ceil((mentorEligibleAt - now) / (24 * 60 * 60))) : null
  const meetsTimeRequirement = canBecomeMentor && (daysUntilMentor === null || daysUntilMentor <= 0)
  const canRegister = meetsScoreRequirement && meetsTimeRequirement

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gradient-to-br from-[#00FF88]/10 to-[#00F0FF]/10 border border-[#00FF88]/30 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#00FF88] mb-1">🎓 Become a Mentor</h3>
          <p className="text-sm text-[#F5F3E8]/70">
            Help new users succeed and earn ProofScore points
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[#00FF88] hover:text-[#00F0FF] transition-colors"
        >
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {/* Requirements */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meetsScoreRequirement ? 'bg-[#00FF88]' : 'bg-[#F5F3E8]/20'}`}>
            {meetsScoreRequirement ? '✓' : '○'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">ProofScore ≥ 8,000</div>
            <div className="text-xs text-[#F5F3E8]/50">
              Current: {score.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meetsTimeRequirement ? 'bg-[#00FF88]' : 'bg-[#F5F3E8]/20'}`}>
            {meetsTimeRequirement ? '✓' : '○'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Maintain 8,000+ for 30 Days</div>
            {daysUntilMentor !== null && daysUntilMentor > 0 && (
              <div className="text-xs text-[#F5F3E8]/50">
                {daysUntilMentor} days remaining
              </div>
            )}
            {!canBecomeMentor && (
              <div className="text-xs text-[#F5F3E8]/50">
                Reach 8,000 to start cooldown
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Benefits (collapsible) */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 rounded-lg bg-[#0F0F0F]/50 space-y-2"
        >
          <div className="text-sm font-bold text-[#00FF88] mb-2">Mentor Benefits:</div>
          <div className="text-xs text-[#F5F3E8]/70 space-y-1">
            <div>• Sponsor up to 10 mentees</div>
            <div>• +50 points when mentee reaches 7,000</div>
            <div>• Help build the VFIDE community</div>
            <div>• Exclusive mentor badge & recognition</div>
            <div>• Priority access to future features</div>
          </div>
        </motion.div>
      )}

      {/* Register Button */}
      <motion.button
        onClick={() => becomeMentor()}
        disabled={!canRegister || isLoading || isSuccess}
        whileHover={canRegister ? { scale: 1.02 } : {}}
        whileTap={canRegister ? { scale: 0.98 } : {}}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          canRegister
            ? 'bg-gradient-to-r from-[#00FF88] to-[#00F0FF] text-[#0A0A0A] hover:shadow-lg hover:shadow-[#00FF88]/50'
            : 'bg-[#F5F3E8]/10 text-[#F5F3E8]/30 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              ⚙️
            </motion.span>
            Registering...
          </span>
        ) : isSuccess ? (
          '✅ Registered as Mentor!'
        ) : (
          'Register as Mentor'
        )}
      </motion.button>

      {!canRegister && (
        <div className="mt-3 text-xs text-center text-[#F5F3E8]/50">
          {!meetsScoreRequirement && 'Increase your ProofScore to qualify'}
          {meetsScoreRequirement && !meetsTimeRequirement && 'Maintain your score to complete cooldown'}
        </div>
      )}
    </motion.div>
  )
}
