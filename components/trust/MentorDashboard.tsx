/**
 * Mentor Dashboard - Overview of mentor status, mentees, and rewards
 */

'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useIsMentor, useMentorInfo, useProofScore } from '@/lib/vfide-hooks'
import { MentorBadge } from './MentorBadge'
import { SponsorMenteeModal } from './SponsorMenteeModal'
import { BecomeMentorCard } from './BecomeMentorCard'
import { Star, Gem, Trophy, Rocket, Lightbulb, Handshake, TrendingUp } from 'lucide-react'

export function MentorDashboard() {
  const { isConnected } = useAccount()
  const { isMentor } = useIsMentor()
  const { menteeCount } = useMentorInfo()
  const { score } = useProofScore()
  const [showSponsorModal, setShowSponsorModal] = useState(false)

  if (!isConnected) {
    return (
      <div className="p-6 rounded-xl bg-zinc-950/50 border border-zinc-100/10 text-center">
        <p className="text-zinc-100/50">Connect your wallet to access mentor features</p>
      </div>
    )
  }

  if (!isMentor) {
    return (
      <div className="space-y-6">
        <BecomeMentorCard />
        
        {/* Why Become a Mentor */}
        <div className="p-6 rounded-xl bg-zinc-950/50 border border-zinc-100/10">
          <h3 className="text-lg font-bold mb-4">Why Become a Mentor?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-100/70">
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="font-medium text-zinc-100">Help Others Succeed</div>
                <div className="text-xs">Guide new users through their VFIDE journey</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gem className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <div className="font-medium text-zinc-100">Earn ProofScore Points</div>
                <div className="text-xs">+50 points for each mentee that reaches 7,000 score</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="font-medium text-zinc-100">Exclusive Badge</div>
                <div className="text-xs">Show your commitment to the community</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Rocket className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <div className="font-medium text-zinc-100">Build Community</div>
                <div className="text-xs">Be part of VFIDE&apos;s mission to empower everyone</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const menteeSlotsAvailable = 10 - menteeCount
  const completionRate = (menteeCount / 10) * 100

  return (
    <div className="space-y-6">
      {/* Mentor Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-linear-to-br from-emerald-400/10 to-cyan-400/10 border border-emerald-400/30 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-emerald-400 mb-2">Mentor Dashboard</h3>
            <p className="text-zinc-100/70">Your mentorship overview</p>
          </div>
          <MentorBadge size="lg" showMenteeCount />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-zinc-950/50">
            <div className="text-zinc-100/50 text-sm mb-1">Your ProofScore</div>
            <div className="text-3xl font-bold text-emerald-400">{score.toLocaleString()}</div>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-950/50">
            <div className="text-zinc-100/50 text-sm mb-1">Active Mentees</div>
            <div className="text-3xl font-bold text-cyan-400">{menteeCount}/10</div>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-950/50">
            <div className="text-zinc-100/50 text-sm mb-1">Slots Available</div>
            <div className="text-3xl font-bold text-amber-400">{menteeSlotsAvailable}</div>
          </div>
        </div>

        {/* Mentee Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-100/70">Mentee Capacity</span>
            <span className="text-emerald-400 font-bold">{completionRate.toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-zinc-950 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-linear-to-r from-emerald-400 to-cyan-400"
              style={{
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
              }}
            />
          </div>
        </div>

        {/* Sponsor Button */}
        <motion.button
          onClick={() => setShowSponsorModal(true)}
          disabled={menteeSlotsAvailable === 0}
          whileHover={menteeSlotsAvailable > 0 ? { scale: 1.02 } : {}}
          whileTap={menteeSlotsAvailable > 0 ? { scale: 0.98 } : {}}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            menteeSlotsAvailable > 0
              ? 'bg-linear-to-r from-emerald-400 to-cyan-400 text-zinc-950 hover:shadow-lg hover:shadow-emerald-400/50'
              : 'bg-zinc-100/10 text-zinc-100/30 cursor-not-allowed'
          }`}
        >
          {menteeSlotsAvailable > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <span>➕</span>
              <span>Sponsor New Mentee</span>
            </span>
          ) : (
            'Maximum Mentees Reached'
          )}
        </motion.button>
      </motion.div>

      {/* Mentorship Impact */}
      <div className="p-6 rounded-xl bg-zinc-950/50 border border-zinc-100/10">
        <h4 className="text-lg font-bold mb-4">Your Mentorship Impact</h4>
        <div className="space-y-3 text-sm text-zinc-100/70">
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/30">
            <span>Mentees Sponsored:</span>
            <span className="text-emerald-400 font-bold">{menteeCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/30">
            <span>Potential Graduation Rewards:</span>
            <span className="text-cyan-400 font-bold">+{menteeCount * 50} points</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/30">
            <span>Total Bonus Given:</span>
            <span className="text-amber-400 font-bold">+{menteeCount * 300} points</span>
          </div>
        </div>
      </div>

      {/* Tips for Mentors */}
      <div className="p-6 rounded-xl bg-zinc-950/50 border border-zinc-100/10">
        <h4 className="text-lg font-bold mb-4">Mentor Tips</h4>
        <div className="space-y-3 text-sm text-zinc-100/70">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-medium text-zinc-100 mb-1">Choose Wisely</div>
              <div className="text-xs">Sponsor users who are actively engaging with VFIDE</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Handshake className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-medium text-zinc-100 mb-1">Stay Connected</div>
              <div className="text-xs">Guide your mentees to activities that earn ProofScore</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <div className="font-medium text-zinc-100 mb-1">Track Progress</div>
              <div className="text-xs">Celebrate when your mentees reach 7,000 and graduate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      <SponsorMenteeModal 
        isOpen={showSponsorModal} 
        onClose={() => setShowSponsorModal(false)} 
      />
    </div>
  )
}
