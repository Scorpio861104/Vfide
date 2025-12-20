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
      <div className="p-6 rounded-xl bg-[#0F0F0F]/50 border border-[#F5F3E8]/10 text-center">
        <p className="text-[#F5F3E8]/50">Connect your wallet to access mentor features</p>
      </div>
    )
  }

  if (!isMentor) {
    return (
      <div className="space-y-6">
        <BecomeMentorCard />
        
        {/* Why Become a Mentor */}
        <div className="p-6 rounded-xl bg-[#0F0F0F]/50 border border-[#F5F3E8]/10">
          <h3 className="text-lg font-bold mb-4">Why Become a Mentor?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#F5F3E8]/70">
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-[#FFD700] flex-shrink-0" />
              <div>
                <div className="font-medium text-[#F5F3E8]">Help Others Succeed</div>
                <div className="text-xs">Guide new users through their VFIDE journey</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gem className="w-6 h-6 text-[#00F0FF] flex-shrink-0" />
              <div>
                <div className="font-medium text-[#F5F3E8]">Earn ProofScore Points</div>
                <div className="text-xs">+50 points for each mentee that reaches 7,000 score</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="w-6 h-6 text-[#FFD700] flex-shrink-0" />
              <div>
                <div className="font-medium text-[#F5F3E8]">Exclusive Badge</div>
                <div className="text-xs">Show your commitment to the community</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Rocket className="w-6 h-6 text-[#50C878] flex-shrink-0" />
              <div>
                <div className="font-medium text-[#F5F3E8]">Build Community</div>
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
        className="p-6 rounded-xl bg-gradient-to-br from-[#00FF88]/10 to-[#00F0FF]/10 border border-[#00FF88]/30 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-[#00FF88] mb-2">Mentor Dashboard</h3>
            <p className="text-[#F5F3E8]/70">Your mentorship overview</p>
          </div>
          <MentorBadge size="lg" showMenteeCount />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-[#0A0A0A]/50">
            <div className="text-[#F5F3E8]/50 text-sm mb-1">Your ProofScore</div>
            <div className="text-3xl font-bold text-[#00FF88]">{score.toLocaleString()}</div>
          </div>
          
          <div className="p-4 rounded-lg bg-[#0A0A0A]/50">
            <div className="text-[#F5F3E8]/50 text-sm mb-1">Active Mentees</div>
            <div className="text-3xl font-bold text-[#00F0FF]">{menteeCount}/10</div>
          </div>
          
          <div className="p-4 rounded-lg bg-[#0A0A0A]/50">
            <div className="text-[#F5F3E8]/50 text-sm mb-1">Slots Available</div>
            <div className="text-3xl font-bold text-[#FFD700]">{menteeSlotsAvailable}</div>
          </div>
        </div>

        {/* Mentee Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#F5F3E8]/70">Mentee Capacity</span>
            <span className="text-[#00FF88] font-bold">{completionRate.toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#0A0A0A] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#00FF88] to-[#00F0FF]"
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
              ? 'bg-gradient-to-r from-[#00FF88] to-[#00F0FF] text-[#0A0A0A] hover:shadow-lg hover:shadow-[#00FF88]/50'
              : 'bg-[#F5F3E8]/10 text-[#F5F3E8]/30 cursor-not-allowed'
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
      <div className="p-6 rounded-xl bg-[#0F0F0F]/50 border border-[#F5F3E8]/10">
        <h4 className="text-lg font-bold mb-4">Your Mentorship Impact</h4>
        <div className="space-y-3 text-sm text-[#F5F3E8]/70">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0A]/30">
            <span>Mentees Sponsored:</span>
            <span className="text-[#00FF88] font-bold">{menteeCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0A]/30">
            <span>Potential Graduation Rewards:</span>
            <span className="text-[#00F0FF] font-bold">+{menteeCount * 50} points</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0A]/30">
            <span>Total Bonus Given:</span>
            <span className="text-[#FFD700] font-bold">+{menteeCount * 300} points</span>
          </div>
        </div>
      </div>

      {/* Tips for Mentors */}
      <div className="p-6 rounded-xl bg-[#0F0F0F]/50 border border-[#F5F3E8]/10">
        <h4 className="text-lg font-bold mb-4">Mentor Tips</h4>
        <div className="space-y-3 text-sm text-[#F5F3E8]/70">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
            <div>
              <div className="font-medium text-[#F5F3E8] mb-1">Choose Wisely</div>
              <div className="text-xs">Sponsor users who are actively engaging with VFIDE</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Handshake className="w-5 h-5 text-[#00F0FF] flex-shrink-0" />
            <div>
              <div className="font-medium text-[#F5F3E8] mb-1">Stay Connected</div>
              <div className="text-xs">Guide your mentees to activities that earn ProofScore</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-[#50C878] flex-shrink-0" />
            <div>
              <div className="font-medium text-[#F5F3E8] mb-1">Track Progress</div>
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
