'use client';

import { motion } from 'framer-motion';
import { Calendar, Info } from 'lucide-react';

type Milestone = {
  month: number;
  percentage: number;
  unlockTime: number | bigint;
  unlocked: boolean;
};

export function ScheduleTab({ schedule }: { schedule?: readonly Milestone[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Vesting Schedule</h2>
      
      {schedule && schedule.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3 rounded-l-xl">Month</th>
                <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Percentage</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Unlock Date</th>
                <th className="text-center text-gray-400 text-sm font-medium px-4 py-3 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {schedule.map((milestone, idx) => (
                <motion.tr 
                  key={idx} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-bold">Month {milestone.month}</td>
                  <td className="px-4 py-3 text-right text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold">{milestone.percentage}%</td>
                  <td className="px-4 py-3 text-gray-400">
                    {Number(milestone.unlockTime) > 0 
                      ? new Date(Number(milestone.unlockTime) * 1000).toLocaleDateString()
                      : 'Not Scheduled'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      milestone.unlocked 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}>
                      {milestone.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <div className="p-4 rounded-2xl bg-white/5 inline-block mb-4">
            <Calendar className="w-12 h-12 opacity-50" />
          </div>
          <p>Loading vesting schedule...</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-purple-500/20">
            <Info className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-sm text-gray-400">
            <strong className="text-white">Dev Reserve Schedule:</strong> 25% of total supply allocated 
            to developer reserve. Tokens vest linearly over 36 months starting from protocol launch, 
            with a 60-day cliff period. Unlocks occur bi-monthly (every 60 days).
          </div>
        </div>
      </div>
    </motion.div>
  );
}
