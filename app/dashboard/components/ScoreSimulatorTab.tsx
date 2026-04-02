'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sliders } from 'lucide-react';

import { GlassCard, containerVariants, itemVariants } from './shared';

export function ScoreSimulatorTab({ currentScore }: { currentScore: number }) {
  const [activities, setActivities] = useState({
    transactions: 10,
    vaultDeposit: 1000,
    governanceVotes: 5,
    endorsements: 3,
    badges: 2,
  });

  const calculateBonus = () => {
    return (
      activities.transactions * 50 +
      Math.floor(activities.vaultDeposit / 100) * 10 +
      activities.governanceVotes * 100 +
      activities.endorsements * 150 +
      activities.badges * 200
    );
  };

  const projectedScore = Math.min(10000, currentScore + calculateBonus());

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-2xl space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-white">
            <Sliders className="text-purple-400" size={28} />
            Score Simulator
          </h2>
          <p className="mb-8 text-white/60">Plan your path to a higher ProofScore</p>

          <div className="space-y-6">
            {[
              { key: 'transactions', label: 'Monthly Transactions', bonus: 50, max: 50 },
              { key: 'vaultDeposit', label: 'Vault Deposit (VFIDE)', bonus: 10, max: 10000, step: 100 },
              { key: 'governanceVotes', label: 'Governance Votes', bonus: 100, max: 20 },
              { key: 'endorsements', label: 'Endorsements Received', bonus: 150, max: 10 },
              { key: 'badges', label: 'New Badges Earned', bonus: 200, max: 10 },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm text-white/80">
                    {item.label} <span className="text-cyan-400/60">(+{item.bonus} per)</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={item.max}
                    step={item.step || 1}
                    value={activities[item.key as keyof typeof activities]}
                    onChange={(e) =>
                      setActivities((previous) => ({
                        ...previous,
                        [item.key]: Number(e.target.value),
                      }))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-purple-500"
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="font-bold text-white">{activities[item.key as keyof typeof activities]}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-white/80">Current Score</span>
              <span className="text-xl font-bold text-white">{currentScore}</span>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-white/80">Projected Bonus</span>
              <span className="text-xl font-bold text-emerald-400">+{calculateBonus()}</span>
            </div>
            <div className="my-4 h-px bg-white/20" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Projected Score</span>
              <span className="text-3xl font-bold text-purple-400">{projectedScore}</span>
            </div>
          </div>

          {projectedScore >= 8000 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-4"
            >
              <CheckCircle2 className="text-emerald-400" size={24} />
              <span className="text-emerald-400">🎉 You will unlock the minimum 0.25% fee rate!</span>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
