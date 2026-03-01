'use client';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gift, 
  Star, 
  Zap, 
  Shield, 
  TrendingUp,
  Award,
  Users,
  Heart,
  Clock,
  Coins,
  Crown,
  Sparkles
} from "lucide-react";

type TabType = 'overview' | 'tiers' | 'rewards' | 'stats';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

export default function BenefitsPage() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Gift, color: 'cyan' },
    { id: 'tiers' as const, label: 'Membership Tiers', icon: Crown, color: 'amber' },
    { id: 'rewards' as const, label: 'Available Rewards', icon: Award, color: 'emerald' },
    { id: 'stats' as const, label: 'My Stats', icon: TrendingUp, color: 'purple' },
  ];

  const colorMap: Record<string, { active: string; hover: string }> = {
    cyan: { active: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25', hover: 'hover:bg-cyan-500/10 hover:text-cyan-400' },
    amber: { active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25', hover: 'hover:bg-amber-500/10 hover:text-amber-400' },
    emerald: { active: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25', hover: 'hover:bg-emerald-500/10 hover:text-emerald-400' },
    purple: { active: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25', hover: 'hover:bg-purple-500/10 hover:text-purple-400' },
  };

  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,215,0,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
      </div>

      <motion.main 
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="min-h-screen pt-24 pb-16"
      >
        <div className="container mx-auto px-3 sm:px-4">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-sm text-cyan-300 mb-4"
            >
              <Sparkles className="w-4 h-4" />
              Exclusive Member Perks
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
                Member Benefits
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Exclusive perks for VFIDE token holders and active governance participants
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const colors = colorMap[tab.color];
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    isActive ? colors?.active ?? '' : `bg-white/5 text-gray-400 ${colors?.hover ?? ''}`
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'tiers' && <TiersTab />}
              {activeTab === 'rewards' && <RewardsTab isConnected={isConnected} />}
              {activeTab === 'stats' && <StatsTab isConnected={isConnected} address={address} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}

// GlassCard component
function _GlassCard({ children, className = "", gradient }: { 
  children: React.ReactNode; 
  className?: string;
  gradient?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient || 'from-white/8 to-white/2'} backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function OverviewTab() {
  const benefits = [
    {
      icon: Coins,
      title: 'Governance Participation',
      description: 'Vote on proposals and earn duty points for active DAO participation',
      color: '#FFD700'
    },
    {
      icon: Star,
      title: 'ProofScore Bonuses',
      description: 'Higher ProofScore unlocks better rates and priority features',
      color: '#00F0FF'
    },
    {
      icon: Users,
      title: 'Referral Bonuses',
      description: 'Receive a one-time bonus when users you refer complete their first purchase',
      color: '#4ECDC4'
    },
    {
      icon: Shield,
      title: 'Guardian Privileges',
      description: 'Special access and voting power for trusted community members',
      color: '#A78BFA'
    },
    {
      icon: Zap,
      title: 'Fee Discounts',
      description: 'Reduced burn fees (as low as 0.25%) for high-ProofScore merchants',
      color: '#FF6B6B'
    },
    {
      icon: Heart,
      title: 'Promotional Campaigns',
      description: 'Recognition badges for completing educational milestones and achievements',
      color: '#F472B6'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-8 text-center">
        <Gift className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-zinc-100 mb-4">Active Participation Benefits</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          VFIDE recognises active participation through governance voting, merchant transactions,
          and community engagement. Build your ProofScore through positive actions to unlock fee discounts.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((benefit, idx) => (
          <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-cyan-400/30 transition-colors">
            <benefit.icon size={32} style={{ color: benefit.color }} className="mb-4" />
            <h3 className="text-xl font-bold text-zinc-100 mb-2">{benefit.title}</h3>
            <p className="text-zinc-400 text-sm">{benefit.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">5</div>
          <div className="text-sm text-zinc-400">Membership Tiers</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-green-400">12</div>
          <div className="text-sm text-zinc-400">Reward Types</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-yellow-400">1.2M</div>
          <div className="text-sm text-zinc-400">VFIDE Distributed</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">8,432</div>
          <div className="text-sm text-zinc-400">Active Members</div>
        </div>
      </div>
    </div>
  );
}

function TiersTab() {
  const tiers = [
    {
      name: 'Bronze',
      color: '#CD7F32',
      requirement: '1,000+ VFIDE',
      benefits: ['Basic fee discounts', 'Community access', 'Voting rights'],
      proofScore: '10+'
    },
    {
      name: 'Silver',
      color: '#C0C0C0',
      requirement: '10,000+ VFIDE',
      benefits: ['5% fee discount', 'Priority support', 'Early access', 'Referral bonuses'],
      proofScore: '25+'
    },
    {
      name: 'Gold',
      color: '#FFD700',
      requirement: '50,000+ VFIDE',
      benefits: ['10% fee discount', 'Priority access', 'Beta features', 'Direct DAO proposals'],
      proofScore: '50+'
    },
    {
      name: 'Platinum',
      color: '#E5E4E2',
      requirement: '250,000+ VFIDE',
      benefits: ['25% fee discount', 'Council eligibility', 'Custom integrations', 'Premium support'],
      proofScore: '75+'
    },
    {
      name: 'Diamond',
      color: '#B9F2FF',
      requirement: '1,000,000+ VFIDE',
      benefits: ['50% fee discount', 'Founding Member status', 'All benefits unlocked', 'Strategic advisor role'],
      proofScore: '90+'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Membership Tiers</h2>
        <p className="text-zinc-400">Hold VFIDE and maintain your ProofScore to unlock higher tiers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {tiers.map((tier, idx) => (
          <div 
            key={idx} 
            className="bg-zinc-800 border-2 rounded-xl p-6 text-center hover:scale-105 transition-transform"
            style={{ borderColor: tier.color }}
          >
            <Crown size={40} style={{ color: tier.color }} className="mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-100 mb-2">{tier.name}</h3>
            <div className="text-sm text-cyan-400 font-bold mb-2">{tier.requirement}</div>
            <div className="text-xs text-zinc-400 mb-4">ProofScore: {tier.proofScore}</div>
            <div className="border-t border-zinc-700 pt-4">
              <ul className="text-xs text-zinc-400 space-y-1">
                {tier.benefits.map((benefit, bidx) => (
                  <li key={bidx} className="flex items-center gap-2">
                    <Sparkles size={12} style={{ color: tier.color }} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">How Tiers Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-cyan-400 font-bold mb-2">Token Holdings</h4>
            <p className="text-zinc-400 text-sm">
              Your tier is determined by the minimum VFIDE balance you hold for 30 consecutive days.
              Short-term holdings don&apos;t count toward tier qualification.
            </p>
          </div>
          <div>
            <h4 className="text-cyan-400 font-bold mb-2">ProofScore Requirement</h4>
            <p className="text-zinc-400 text-sm">
              Even with sufficient tokens, you must maintain the minimum ProofScore to access
              tier benefits. This ensures only trusted members receive premium perks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardsTab({ isConnected: _isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-8">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <Award className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-100 mb-2">No Token Rewards</h3>
        <p className="text-zinc-400 max-w-lg mx-auto">
          VFIDE is a governance utility token. Token distributions for holding,
          referrals, or activity are not offered — doing so would create an
          expectation of profits and conflict with Howey Test compliance.
        </p>
        <p className="text-zinc-500 text-sm mt-4">
          Participation XP and governance badges are available through the{' '}
          <a href="/quests" className="text-cyan-400 hover:underline">Quests</a> page.
        </p>
      </div>
    </div>
  );
}

function StatsTab({ isConnected, address }: { isConnected: boolean; address?: string }) {
  if (!isConnected) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <TrendingUp className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-100 mb-2">Connect Wallet to View Stats</h3>
        <p className="text-zinc-400">Connect your wallet to see your membership statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Summary */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            G
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Gold Member</h2>
            <p className="text-zinc-400 text-sm mb-2">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                Gold Tier
              </span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                ProofScore: 68
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Coins className="text-yellow-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">52,450</div>
          <div className="text-sm text-zinc-400">VFIDE Balance</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <TrendingUp className="text-green-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">3,420</div>
          <div className="text-sm text-zinc-400">Total Earned</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Users className="text-purple-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">7</div>
          <div className="text-sm text-zinc-400">Referrals</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <Clock className="text-cyan-400 mb-3" size={24} />
          <div className="text-2xl font-bold text-zinc-100">145</div>
          <div className="text-sm text-zinc-400">Days Active</div>
        </div>
      </div>

      {/* Activity History */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'Governance vote cast', amount: '+10 XP', time: '2 hours ago' },
            { action: 'ProofScore increased', amount: '+5 points', time: '3 days ago' },
            { action: 'Daily check-in', amount: '+50 XP', time: '5 days ago' },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
              <div>
                <div className="text-zinc-100 text-sm">{activity.action}</div>
                <div className="text-xs text-zinc-400">{activity.time}</div>
              </div>
              <span className="text-purple-400 font-bold">{activity.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Tier Progress */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Progress to Platinum</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">52,450 / 250,000 VFIDE</span>
            <span className="text-cyan-400">21%</span>
          </div>
          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-[#E5E4E2] w-[21%] rounded-full" />
          </div>
        </div>
        <p className="text-zinc-400 text-sm">
          You need 197,550 more VFIDE to reach Platinum tier.
        </p>
      </div>
    </div>
  );
}
