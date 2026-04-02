'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Clock, Users, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CouncilElectionABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

export function VotingTab({ isConnected }: { isConnected: boolean }) {
  const removalVotes = [
    {
      target: '0x9876...5432',
      targetName: 'Council Member X',
      reason: 'ProofScore dropped below threshold for 30 days',
      votesFor: 4,
      votesNeeded: 5,
      deadline: '2 days',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Voting Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 backdrop-blur-xl border border-red-500/20 p-4 sm:p-6 md:p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20">
            <Vote className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Member Removal Voting</h2>
            <p className="text-gray-400">Council members can vote to remove underperforming members</p>
          </div>
        </div>
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 text-sm font-bold">Vote Threshold: &gt;50% (7/12)</p>
          <p className="text-gray-400 text-sm">At least 7 council members must vote for removal</p>
        </div>
      </motion.div>

      {/* Active Removal Votes */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Active Removal Votes</h3>
        {removalVotes.length > 0 ? (
          <div className="space-y-4">
            {removalVotes.map((vote, idx) => (
              <div key={idx} className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-white font-bold">{vote.targetName}</div>
                    <div className="text-xs text-gray-400 font-mono">{vote.target}</div>
                  </div>
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold">
                    Removal Vote
                  </span>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Reason:</div>
                  <p className="text-white text-sm bg-white/5 border border-white/10 p-3 rounded-xl">{vote.reason}</p>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Votes:</span>
                    <span className="text-cyan-400 font-bold">{vote.votesFor}/{vote.votesNeeded}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={14} />
                    {vote.deadline} remaining
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(vote.votesFor / vote.votesNeeded) * 100}%` }}
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                  />
                </div>
                {isConnected ? (
                  <div className="flex gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-2 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
                    >
                      Vote For Removal
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      Abstain
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm">Connect wallet to vote</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-block mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-gray-400">No active removal votes</p>
          </div>
        )}
      </motion.div>

      {/* Initiate Removal (Council Only) */}
      {isConnected && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Initiate Member Removal</h3>
          <p className="text-gray-400 text-sm mb-4">
            Council members can propose removal of another member who fails to meet requirements.
          </p>
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Target Member Address</label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Reason for Removal</label>
              <textarea
                placeholder="Describe why this member should be removed..."
                rows={3}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle size={18} />
            Propose Removal
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
