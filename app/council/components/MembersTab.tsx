'use client';
import { motion } from 'framer-motion';
import { Calendar, Crown, TrendingUp } from 'lucide-react';

export function MembersTab() {
  const members = [
    { 
      address: '0x1234...5678', 
      name: 'Council Member 1',
      role: 'Chair',
      proofScore: 95,
      joinedDays: 180,
      status: 'active'
    },
    { 
      address: '0x2345...6789', 
      name: 'Council Member 2',
      role: 'Secretary',
      proofScore: 88,
      joinedDays: 120,
      status: 'active'
    },
    { 
      address: '0x3456...7890', 
      name: 'Council Member 3',
      role: 'Treasury Lead',
      proofScore: 92,
      joinedDays: 90,
      status: 'active'
    },
    { 
      address: '0x4567...8901', 
      name: 'Council Member 4',
      role: 'Tech Lead',
      proofScore: 85,
      joinedDays: 60,
      status: 'active'
    },
    { 
      address: '0x5678...9012', 
      name: 'Council Member 5',
      role: 'Community Lead',
      proofScore: 78,
      joinedDays: 45,
      status: 'active'
    },
    { 
      address: '0x6789...0123', 
      name: 'Council Member 6',
      role: 'Member',
      proofScore: 72,
      joinedDays: 30,
      status: 'active'
    },
    { 
      address: '—', 
      name: 'Vacant Seat',
      role: 'Open',
      proofScore: 0,
      joinedDays: 0,
      status: 'vacant'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Members List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
            <Crown className="w-5 h-5 text-indigo-400" />
          </div>
          Current Council Members
        </h3>
        <div className="space-y-4">
          {members.map((member, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.005, x: 4 }}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl ${
                member.status === 'vacant' 
                  ? 'bg-white/5 border border-dashed border-white/20' 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-4 mb-3 md:mb-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  member.status === 'vacant' 
                    ? 'bg-white/5 border border-white/10 text-gray-500' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                } font-bold`}>
                  {member.status === 'vacant' ? '?' : idx + 1}
                </div>
                <div>
                  <div className="text-white font-bold">{member.name}</div>
                  <div className="text-xs text-gray-400 font-mono truncate max-w-[120px] sm:max-w-[200px]">{member.address}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  member.role === 'Chair' 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : member.role === 'Open'
                    ? 'bg-white/5 text-gray-400 border-white/10'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                }`}>
                  {member.role}
                </span>
                {member.status !== 'vacant' && (
                  <>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                      Score: {member.proofScore}
                    </span>
                    <span className="text-xs text-gray-400">
                      <Calendar size={12} className="inline mr-1" />
                      {member.joinedDays} days
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Daily Score Check */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
            <TrendingUp className="text-cyan-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Daily Score Verification</h3>
            <p className="text-gray-400 text-sm">CouncilManager checks member ProofScores daily</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last Check</span>
            <span className="text-white">Today, 00:00 UTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Members Passing</span>
            <span className="text-emerald-400 font-semibold">12 / 12</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Minimum Required Score</span>
            <span className="text-cyan-400 font-semibold">7000 (70%)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

