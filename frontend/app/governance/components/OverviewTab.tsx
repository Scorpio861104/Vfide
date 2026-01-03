"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Clock, FileText, Sparkles, Users } from 'lucide-react'
import { useAccount } from 'wagmi'

import { useCountdown } from './useCountdown'

export function OverviewTab({
  score,
  proposalCount,
  votingPowerData,
  voterStats,
  isEligible,
}: {
  score?: number
  proposalCount?: number
  votingPowerData?: readonly bigint[]
  voterStats?: unknown
  isEligible?: boolean
}) {
  const { address } = useAccount()
  const votingPowerTuple = votingPowerData as readonly [bigint, bigint, bigint] | undefined
  const votingPower = votingPowerTuple?.[2] ? Number(votingPowerTuple[2]) : score || 0
  const isEligibleBool = (isEligible as boolean) || false

  const voterStatsTuple = voterStats as readonly [bigint, bigint] | undefined
  const votesCast = voterStatsTuple?.[0] ? Number(voterStatsTuple[0]) : 0

  return (
    <>
      <section className="py-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Your Voting Power</div>
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              {address ? (
                <>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">{votingPower}</div>
                  <div className="text-gray-500 text-sm mt-1">Based on ProofScore</div>
                  <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
                    {isEligibleBool ? (
                      <>
                        <Sparkles className="w-3 h-3" /> Eligible to vote
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" /> Not eligible
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-lg text-gray-500">Connect wallet</div>
              )}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Active Proposals</div>
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{proposalCount || 0}</div>
              <div className="text-emerald-400 text-sm mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> On-chain data
              </div>
              <div className="mt-3 text-xs text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Vote to participate
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Your Participation</div>
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{votesCast}</div>
              <div className="text-gray-500 text-sm mt-1">Votes Cast</div>
              <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> Keep voting!
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Governance Fatigue</div>
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-amber-400">40%</div>
              <div className="text-gray-500 text-sm mt-1">Current: 506/845</div>
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> +42/day recovery
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              Upcoming Voting Deadlines
            </h2>
            <div className="space-y-3">
              <DeadlineCard id={142} title="Treasury: Security Audit" hoursRemaining={5} voted={false} />
              <DeadlineCard id={141} title="Protocol: Multi-Chain" hoursRemaining={24} voted={false} />
              <DeadlineCard id={140} title="Fee Reduction to 0.20%" hoursRemaining={48} voted={true} />
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function DeadlineCard({ id, title, hoursRemaining, voted }: { id: number; title: string; hoursRemaining: number; voted: boolean }) {
  const [endTime] = useState(() => Date.now() + hoursRemaining * 60 * 60 * 1000)
  const timeLeft = useCountdown(endTime)

  const urgency = hoursRemaining < 12 ? 'urgent' : hoursRemaining < 48 ? 'warning' : 'normal'
  const colorMap = {
    urgent: { border: 'border-red-500/50', bg: 'from-red-500/10 to-red-500/5', text: 'text-red-400', glow: 'shadow-red-500/20' },
    warning: { border: 'border-amber-500/50', bg: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    normal: { border: 'border-emerald-500/50', bg: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  }
  const colors = colorMap[urgency]

  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 4 }}
      className={`flex items-center justify-between p-4 bg-gradient-to-r ${colors.bg} backdrop-blur-sm border ${colors.border} rounded-xl hover:shadow-lg ${colors.glow} transition-all`}
    >
      <div>
        <div className="text-white font-bold">{title}</div>
        <div className="text-gray-500 text-sm">Proposal #{id}</div>
      </div>
      <div className="text-right">
        <div className={`font-bold text-lg ${colors.text}`}>{timeLeft} left</div>
        <div className={`text-sm flex items-center gap-1 justify-end ${voted ? 'text-emerald-400' : 'text-gray-500'}`}>
          {voted ? (
            <>
              <Sparkles className="w-3 h-3" /> Voted FOR
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" /> Not voted
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
