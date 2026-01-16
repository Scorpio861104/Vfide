'use client';

import Link from 'next/link';
import { UserPlus, Gift, Share2, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InviteLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08080A] to-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <UserPlus className="w-8 h-8 text-[#EC4899]" />
            <h1 className="text-4xl md:text-5xl font-bold">Invite Friends</h1>
          </div>
          <p className="text-lg text-[#A8A8B3] max-w-2xl mx-auto">
            Share VFIDE with friends and earn rewards together
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-[#1A1A26] border border-[#2A2A38] rounded-xl"
          >
            <div className="w-12 h-12 bg-[#EC4899]/10 rounded-lg flex items-center justify-center mb-4">
              <Gift className="w-6 h-6 text-[#EC4899]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
            <p className="text-[#A8A8B3]">
              Get bonus VFIDE tokens for every friend who joins and reaches certain milestones
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-[#1A1A26] border border-[#2A2A38] rounded-xl"
          >
            <div className="w-12 h-12 bg-[#EC4899]/10 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-[#EC4899]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Boost ProofScore</h3>
            <p className="text-[#A8A8B3]">
              Increase your reputation and unlock lower fees as your network grows
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-[#1A1A26] border border-[#2A2A38] rounded-xl"
          >
            <div className="w-12 h-12 bg-[#EC4899]/10 rounded-lg flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-[#EC4899]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Build Community</h3>
            <p className="text-[#A8A8B3]">
              Help grow the VFIDE ecosystem and benefit from a stronger network
            </p>
          </motion.div>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1A1A26] border border-[#2A2A38] rounded-xl p-8 mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">How Referrals Work</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#EC4899]/10 rounded-full flex items-center justify-center text-[#EC4899] font-bold">
                1
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Get Your Referral Link</h3>
                <p className="text-[#A8A8B3]">
                  Visit the Headhunter (Referral) program to generate your unique invite link
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#EC4899]/10 rounded-full flex items-center justify-center text-[#EC4899] font-bold">
                2
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Share with Friends</h3>
                <p className="text-[#A8A8B3]">
                  Send your link via social media, email, or messaging apps
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#EC4899]/10 rounded-full flex items-center justify-center text-[#EC4899] font-bold">
                3
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Earn Together</h3>
                <p className="text-[#A8A8B3]">
                  When they join and participate, both you and your friend earn rewards
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reward Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-[#1A1A26] to-[#2A1A38] border border-[#EC4899]/20 rounded-xl p-8 mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Referral Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0A0A0F]/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-[#EC4899] mb-2">+3%</div>
              <h3 className="text-lg font-semibold mb-2">For You (Referrer)</h3>
              <p className="text-[#A8A8B3] text-sm">
                Earn 3% bonus tokens from the referral pool when your friend joins
              </p>
            </div>
            <div className="bg-[#0A0A0F]/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-[#EC4899] mb-2">+2%</div>
              <h3 className="text-lg font-semibold mb-2">For Friend (Referee)</h3>
              <p className="text-[#A8A8B3] text-sm">
                Your friend gets 2% bonus tokens as a welcome gift
              </p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-[#A8A8B3]">
              Rewards are distributed from the 15M token bonus pool
            </p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/headhunter"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#EC4899] to-[#F59E0B] rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-[#EC4899]/20 transition-all"
          >
            Get Your Referral Link
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1A1A26] border border-[#2A2A38] rounded-xl font-semibold text-white hover:border-[#EC4899] transition-all"
          >
            View Leaderboard
          </Link>
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-[#6B6B78]">
            Have an invite code? Enter it at{' '}
            <Link href="/headhunter" className="text-[#EC4899] hover:underline">
              the Headhunter page
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
