'use client';

import { Coins, Gift, Heart, Shield, Star, Zap } from 'lucide-react';

export function OverviewTab() {
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
