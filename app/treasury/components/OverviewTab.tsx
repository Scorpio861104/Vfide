'use client';

import { Heart, PieChart, TrendingUp, Users, Wallet } from 'lucide-react';

import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
} as const;

export function OverviewTab() {
  const treasuryStats = [
    { label: 'Total Treasury', value: '45.2M VFIDE', icon: Wallet, gradient: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    { label: 'Sanctum (Charity)', value: '2.1M VFIDE', icon: Heart, gradient: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
    { label: 'Ecosystem Vault', value: '18.5M VFIDE', icon: Users, gradient: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    { label: 'Operations', value: '12.3M VFIDE', icon: TrendingUp, gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  ];

  const recentDistributions = [
    { recipient: 'Council Operations', amount: '50,000 VFIDE', date: '2 hours ago', type: 'council' },
    { recipient: 'Education Grants', amount: '25,000 VFIDE', date: '1 day ago', type: 'charity' },
    { recipient: 'Liquidity Operations', amount: '100,000 VFIDE', date: '3 days ago', type: 'ecosystem' },
    { recipient: 'Merchant Service Fees', amount: '15,000 VFIDE', date: '5 days ago', type: 'ecosystem' },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {treasuryStats.map((stat, idx) => (
          <motion.div 
            key={idx} 
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-6 group ring-effect`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className={`w-5 h-5 ${stat.text}`} />
              </div>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Allocation Chart */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
            <PieChart className="w-5 h-5 text-purple-400" />
          </div>
          Fee Distribution Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ scale: 1.02 }} className="text-center p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl ring-effect">
            <div className="text-4xl font-bold text-orange-400 mb-2">40%</div>
            <div className="text-white font-bold">Burn</div>
            <div className="text-xs text-gray-500">Deflationary mechanism</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} className="text-center p-6 bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-500/20 rounded-2xl ring-effect">
            <div className="text-4xl font-bold text-pink-400 mb-2">10%</div>
            <div className="text-white font-bold">Sanctum</div>
            <div className="text-xs text-gray-400">Charity fund</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} className="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-2xl ring-effect">
            <div className="text-4xl font-bold text-cyan-400 mb-2">50%</div>
            <div className="text-white font-bold">Ecosystem</div>
            <div className="text-xs text-gray-400">Council, staking, incentives</div>
          </motion.div>
        </div>
      </GlassCard>

      {/* Recent Distributions */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6">Recent Distributions</h3>
        <div className="space-y-3">
          {recentDistributions.map((dist, idx) => (
            <motion.div 
              key={idx} 
              whileHover={{ scale: 1.01 }}
              className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  dist.type === 'council' ? 'bg-purple-500/20' :
                  dist.type === 'charity' ? 'bg-pink-500/20' : 'bg-cyan-500/20'
                }`}>
                  {dist.type === 'council' ? <Users size={20} className="text-purple-400" /> :
                   dist.type === 'charity' ? <Heart size={20} className="text-pink-400" /> :
                   <TrendingUp size={20} className="text-cyan-400" />}
                </div>
                <div>
                  <div className="text-white font-bold">{dist.recipient}</div>
                  <div className="text-xs text-gray-400">{dist.date}</div>
                </div>
              </div>
              <div className="text-cyan-400 font-bold">{dist.amount}</div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}
