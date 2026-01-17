'use client'

/**
 * Mentorship Page - Mentor/Mentee matching and management
 * Phase 3 implementation
 */

import { Footer } from '@/components/layout/Footer'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useMentorInfo, useBecomeMentor, useSponsorMentee } from '@/hooks/useMentorHooks'
import { useProofScore } from '@/lib/vfide-hooks'
import { 
  Users, 
  Star, 
  Award, 
  ArrowRight, 
  CheckCircle,
  UserPlus,
  Info
} from 'lucide-react'

export default function MentorshipPage() {
  const { address } = useAccount()
  const { score } = useProofScore()
  const mentorInfo = useMentorInfo(address)
  const { becomeMentor, isLoading: becomingMentor, isSuccess: becameMentor } = useBecomeMentor()
  const [menteeAddress, setMenteeAddress] = useState('')
  const { sponsorMentee, isLoading: sponsoring } = useSponsorMentee(menteeAddress as `0x${string}`)

  const canBecomeMentor = score >= 7000
  const isMentor = mentorInfo.isMentor

  return (
    <>
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Mentorship Program
              </h1>
              <p className="text-xl md:text-2xl text-[#A0A0A5] leading-relaxed">
                High-trust users guide newcomers and earn rewards for their success
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            
            {!address ? (
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8 text-center">
                <p className="text-[#A0A0A5]">Connect your wallet to participate in the mentorship program</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Become a Mentor */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-[#00F0FF]/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#00F0FF]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#F5F3E8]">Become a Mentor</h2>
                      <p className="text-sm text-[#A0A0A5]">Guide newcomers and earn rewards</p>
                    </div>
                  </div>

                  {isMentor ? (
                    <div className="space-y-4">
                      <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-[#00FF88] font-bold mb-2">
                          <CheckCircle className="w-5 h-5" />
                          You are a Mentor!
                        </div>
                        <p className="text-sm text-[#A0A0A5]">
                          {mentorInfo.menteeCount} mentees • Capacity: {mentorInfo.menteeCount}/10
                        </p>
                      </div>

                      {/* Sponsor Mentee */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#F5F3E8]">Sponsor New Mentee</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Mentee wallet address (0x...)"
                            value={menteeAddress}
                            onChange={(e) => setMenteeAddress(e.target.value)}
                            className="flex-1 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-2 text-[#F5F3E8] placeholder-[#6A6A6F] focus:border-[#00F0FF] focus:outline-none"
                          />
                          <button
                            onClick={() => sponsorMentee()}
                            disabled={!menteeAddress || sponsoring || mentorInfo.menteeCount >= 10}
                            className="px-6 py-2 bg-[#00F0FF] hover:bg-[#00D0DD] disabled:bg-[#3A3A3F] disabled:text-[#6A6A6F] text-[#1A1A1D] font-bold rounded-lg transition-colors"
                          >
                            {sponsoring ? 'Sponsoring...' : 'Sponsor'}
                          </button>
                        </div>
                        {mentorInfo.menteeCount >= 10 && (
                          <p className="text-xs text-amber-400">Maximum mentee capacity reached (10)</p>
                        )}
                      </div>
                    </div>
                  ) : canBecomeMentor ? (
                    <div className="space-y-4">
                      <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#A0A0A5]">Your ProofScore</span>
                          <span className="font-bold text-[#00F0FF]">{score}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#A0A0A5]">Required Score</span>
                          <span className="font-bold text-[#F5F3E8]">7,000</span>
                        </div>
                      </div>

                      <button
                        onClick={() => becomeMentor()}
                        disabled={becomingMentor || becameMentor}
                        className="w-full px-6 py-3 bg-[#00F0FF] hover:bg-[#00D0DD] disabled:bg-[#3A3A3F] disabled:text-[#6A6A6F] text-[#1A1A1D] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {becameMentor ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Registered as Mentor!
                          </>
                        ) : becomingMentor ? (
                          'Registering...'
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" />
                            Become a Mentor
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-amber-400 text-sm">
                        You need a ProofScore of at least 7,000 to become a mentor. 
                        Your current score: <strong>{score}</strong>
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Benefits & Stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Benefits */}
                  <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                    <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Mentor Benefits</h3>
                    <div className="space-y-3">
                      <BenefitItem 
                        icon={<Award className="w-5 h-5" />}
                        title="Exclusive Badge"
                        description='"Mentor" badge on your profile'
                      />
                      <BenefitItem 
                        icon={<Star className="w-5 h-5" />}
                        title="Bonus Points"
                        description="+50 ProofScore when mentee reaches 7,000"
                      />
                      <BenefitItem 
                        icon={<Users className="w-5 h-5" />}
                        title="Capacity"
                        description="Sponsor up to 10 mentees"
                      />
                      <BenefitItem 
                        icon={<ArrowRight className="w-5 h-5" />}
                        title="Priority Access"
                        description="Early access to new features"
                      />
                    </div>
                  </div>

                  {/* How It Works */}
                  <div className="bg-linear-to-br from-[#00F0FF]/10 to-[#0080FF]/10 border-2 border-[#00F0FF]/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-[#00F0FF]" />
                      <h3 className="text-lg font-bold text-[#00F0FF]">How It Works</h3>
                    </div>
                    <ol className="space-y-2 text-sm text-[#A0A0A5]">
                      <li className="flex gap-2">
                        <span className="text-[#00F0FF] font-bold">1.</span>
                        Register as a mentor (requires 7,000+ ProofScore)
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00F0FF] font-bold">2.</span>
                        Sponsor newcomers by adding their wallet address
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00F0FF] font-bold">3.</span>
                        Guide and support them as they learn VFIDE
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00F0FF] font-bold">4.</span>
                        Earn +50 points when they reach 7,000 score
                      </li>
                    </ol>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function BenefitItem({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-[#1A1A1D] rounded-lg flex items-center justify-center text-[#00F0FF] flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-[#F5F3E8]">{title}</div>
        <div className="text-sm text-[#A0A0A5]">{description}</div>
      </div>
    </div>
  )
}
