/**
 * Sponsor Mentee Modal - Interface for mentors to sponsor new users
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useSponsorMentee, useIsMentor, useMentorInfo, useProofScore } from '@/lib/vfide-hooks'
import { isAddress } from 'viem'

interface SponsorMenteeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SponsorMenteeModal({ isOpen, onClose }: SponsorMenteeModalProps) {
  const { isMentor } = useIsMentor()
  const { menteeCount } = useMentorInfo()
  const [menteeAddress, setMenteeAddress] = useState('')
  const [isValidAddress, setIsValidAddress] = useState(false)
  
  const { sponsorMentee, isSponsoring, isSuccess } = useSponsorMentee(
    isValidAddress ? menteeAddress as `0x${string}` : '0x0000000000000000000000000000000000000000'
  )
  
  // Check mentee's score to show preview
  const { score: menteeScore, tier: menteeTier } = useProofScore(
    isValidAddress ? menteeAddress as `0x${string}` : undefined
  )

  const handleAddressChange = (value: string) => {
    setMenteeAddress(value)
    setIsValidAddress(isAddress(value))
  }

  const handleSponsor = () => {
    if (isValidAddress && !isSponsoring) {
      sponsorMentee()
    }
  }

  const canSponsor = isMentor && menteeCount < 10 && isValidAddress

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#0F0F0F] border border-[#00FF88]/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#00FF88]">
                  🎓 Sponsor a Mentee
                </h2>
                <button
                  onClick={onClose}
                  className="text-[#F5F3E8]/50 hover:text-[#F5F3E8] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Status */}
              <div className="mb-6 p-4 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20">
                <div className="text-sm text-[#F5F3E8]/70">
                  Mentees: <span className="text-[#00FF88] font-bold">{menteeCount}/10</span>
                </div>
                <div className="text-xs text-[#F5F3E8]/50 mt-1">
                  You can sponsor {10 - menteeCount} more {10 - menteeCount === 1 ? 'user' : 'users'}
                </div>
              </div>

              {/* Address Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Mentee Wallet Address
                </label>
                <input
                  type="text"
                  value={menteeAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-lg bg-[#0A0A0A] border border-[#F5F3E8]/20 focus:border-[#00FF88] focus:outline-none transition-colors text-[#F5F3E8]"
                />
                {menteeAddress && !isValidAddress && (
                  <div className="mt-2 text-xs text-[#FF4444]">
                    Invalid Ethereum address
                  </div>
                )}
              </div>

              {/* Mentee Preview */}
              {isValidAddress && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-lg bg-[#0A0A0A] border border-[#F5F3E8]/10"
                >
                  <div className="text-sm font-medium mb-3">Preview</div>
                  <div className="space-y-2 text-xs text-[#F5F3E8]/70">
                    <div className="flex justify-between">
                      <span>Current Score:</span>
                      <span className="text-[#00FF88]">{menteeScore.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Tier:</span>
                      <span className="text-[#00F0FF]">{menteeTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>After Sponsorship:</span>
                      <span className="text-[#00FF88] font-bold">+300 → {(menteeScore + 300).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Benefits Info */}
              <div className="mb-6 p-4 rounded-lg bg-[#0F0F0F]/50 border border-[#F5F3E8]/10">
                <div className="text-sm font-medium mb-2 text-[#00FF88]">
                  What Happens:
                </div>
                <div className="space-y-2 text-xs text-[#F5F3E8]/70">
                  <div>• Mentee receives +300 bonus points instantly</div>
                  <div>• You get +50 points when they reach 7,000</div>
                  <div>• Mentee can only have ONE mentor</div>
                  <div>• Bonus is permanent (doesn&apos;t expire)</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-lg bg-[#F5F3E8]/10 hover:bg-[#F5F3E8]/20 transition-colors font-medium"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleSponsor}
                  disabled={!canSponsor || isSponsoring || isSuccess}
                  whileHover={canSponsor ? { scale: 1.02 } : {}}
                  whileTap={canSponsor ? { scale: 0.98 } : {}}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    canSponsor
                      ? 'bg-gradient-to-r from-[#00FF88] to-[#00F0FF] text-[#0A0A0A] hover:shadow-lg hover:shadow-[#00FF88]/50'
                      : 'bg-[#F5F3E8]/10 text-[#F5F3E8]/30 cursor-not-allowed'
                  }`}
                >
                  {isSponsoring ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ⚙️
                      </motion.span>
                      Sponsoring...
                    </span>
                  ) : isSuccess ? (
                    '✅ Sponsored!'
                  ) : (
                    'Sponsor Mentee'
                  )}
                </motion.button>
              </div>

              {!canSponsor && isValidAddress && (
                <div className="mt-3 text-xs text-center text-[#F5F3E8]/50">
                  {!isMentor && 'You must be a registered mentor'}
                  {isMentor && menteeCount >= 10 && 'Maximum mentees reached (10/10)'}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
