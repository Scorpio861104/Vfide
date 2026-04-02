'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CouncilSalaryABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

export function SalaryTab({ isConnected: _isConnected }: { isConnected: boolean }) {
  // Salary is NOT fixed - funded by ecosystem fees, distributed every 120 days
  const salaryHistory = [
    { period: 'Period 1 (Days 1-120)', amount: 'Variable (fees collected)', recipients: 12, status: 'pending' },
  ];

  return (
    <div className="space-y-8">
      {/* Salary Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 p-4 sm:p-6 md:p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Council Salary System</h2>
            <p className="text-gray-400">Fee-funded compensation for eligible council members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: 'Variable', label: 'Funded by ecosystem fees', gradient: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { value: '120 Days', label: 'Distribution Interval', gradient: 'from-white/10 to-white/5', border: 'border-white/10', text: 'text-white' },
            { value: 'Equal', label: 'Split among eligible', gradient: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-400' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-xl p-4`}>
              <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Distribution History */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Distribution History</h3>
        <div className="space-y-3">
          {salaryHistory.map((entry) => (
            <div key={entry.period} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Calendar className="text-gray-400" size={20} />
                </div>
                <div>
                  <div className="text-white font-bold">{entry.period}</div>
                  <div className="text-xs text-gray-400">{entry.recipients} recipients</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">{entry.amount}</div>
                <div className="text-xs text-emerald-400">
                  <CheckCircle size={12} className="inline mr-1" />
                  Distributed
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trigger Distribution (Admin) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Distribute Salary</h3>
        <p className="text-gray-400 text-sm mb-4">
          Keeper can trigger monthly salary distribution on or after the 1st of each month.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Next Distribution Available</span>
            <span className="text-cyan-400 font-bold">January 1, 2026</span>
          </div>
        </div>
        <button 
          className="w-full bg-white/5 text-gray-500 font-bold py-3 rounded-xl border border-white/10 cursor-not-allowed"
          disabled
        >
          Distribution Not Available Yet
        </button>
      </motion.div>
    </div>
  );
}

