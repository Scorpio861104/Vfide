'use client';
import { GlassCard } from "@/components/ui/GlassCard";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, Clock, Crown, DollarSign, Shield, Sparkles, Star, TrendingUp, Users, Vote } from 'lucide-react';



export function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <GlassCard className="p-8 text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 inline-block mb-4">
          <Users className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">VFIDE Governance Council</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          The Council manages day-to-day protocol operations, reviews proposals, and ensures 
          the smooth functioning of the VFIDE ecosystem. Members are elected by token holders.
        </p>
      </GlassCard>

      {/* Council Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { value: '12', label: 'Council Seats', gradient: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
          { value: '--', label: 'Active Members', gradient: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
          { value: '365', label: 'Days Term Length', gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
          { value: '120d', label: 'Pay Interval', gradient: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
        ].map((stat, _idx) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-6 text-center`}
          >
            <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Responsibilities */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          Council Responsibilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Shield, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20', title: 'Protocol Security', desc: 'Monitor and respond to security incidents, manage emergency controls' },
            { icon: Vote, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20', title: 'Proposal Review', desc: 'Review and recommend DAO proposals before community voting' },
            { icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', title: 'Treasury Oversight', desc: 'Approve multi-sig transactions and manage fund allocations' },
            { icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/20', title: 'Ecosystem Growth', desc: 'Drive partnerships, integrations, and community expansion' },
          ].map((item, _idx) => (
            <motion.div 
              key={item.title}
              whileHover={{ scale: 1.02 }}
              className={`flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br ${item.bg} border ${item.border}`}
            >
              <item.icon className={`${item.color} shrink-0`} size={24} />
              <div>
                <h4 className="text-white font-bold mb-1">{item.title}</h4>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Contracts Info */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Smart Contracts</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-bold">CouncilManager</div>
              <div className="text-xs text-gray-400">Daily score checks and payment distribution</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-bold">CouncilSalary</div>
              <div className="text-xs text-gray-400">Salary distribution and removal voting</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-bold">CouncilElection</div>
              <div className="text-xs text-gray-400">Election cycles and candidate registration</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">Active</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

