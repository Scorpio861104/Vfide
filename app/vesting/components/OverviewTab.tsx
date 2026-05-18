'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export function OverviewTab({ vestingStatus }: { vestingStatus?: readonly [bigint, bigint, bigint, bigint, number, bigint, boolean] }) {
  // Calculate percentages
  const totalAllocation = vestingStatus?.[0] || 0n;
  const vestedAmount = vestingStatus?.[1] || 0n;
  const vestedPercent = totalAllocation > 0n ? Number((vestedAmount * 100n) / totalAllocation) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Vesting Progress */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Vesting Progress</h2>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-bold">{vestedPercent}%</span>
          </div>
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${vestedPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-gray-400">Current Milestone</span>
            <span className="text-white font-bold">
              {vestingStatus ? `${vestingStatus[4]} / 48` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-gray-400">Next Unlock</span>
            <span className="text-white font-bold">
              {vestingStatus && vestingStatus[5] > 0n
                ? new Date(Number(vestingStatus[5]) * 1000).toLocaleDateString()
                : 'Complete'}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-gray-400">Vesting Complete</span>
            <span className={`font-bold ${vestingStatus?.[6] ? 'text-emerald-400' : 'text-amber-400'}`}>
              {vestingStatus?.[6] ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">How Vesting Works</h2>
        <div className="space-y-4">
          {[
            { title: 'Cliff Period', desc: '60-day cliff before first unlock begins', bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400' },
            { title: 'Linear Vesting', desc: 'Tokens unlock bi-monthly over 36 months', bgColor: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
            { title: 'Claim Anytime', desc: 'Claim vested tokens whenever convenient', bgColor: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
            { title: 'Beneficiary Only', desc: 'Only designated beneficiary can claim', bgColor: 'bg-amber-500/20', iconColor: 'text-amber-400' },
            { title: 'Protocol Sync', desc: 'Vesting starts from protocol launch', bgColor: 'bg-violet-500/20', iconColor: 'text-violet-400' },
            { title: 'Pause Protection', desc: 'Claims can be paused for emergencies', bgColor: 'bg-rose-500/20', iconColor: 'text-rose-400' },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                <CheckCircle className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div>
                <div className="text-white font-bold">{item.title}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
