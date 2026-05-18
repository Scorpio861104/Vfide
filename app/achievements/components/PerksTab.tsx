'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useAccount } from 'wagmi';
import { LEVEL_PERKS, useGamification } from '@/lib/gamification';

export function PerksTab() {
  const { address } = useAccount();
  const { progress } = useGamification(address);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6">
          <h3 className="mb-2 text-xl font-bold text-zinc-100">Level Perks</h3>
          <p className="text-sm text-zinc-400">
            Every level you earn unlocks real platform benefits — fee discounts, governance voting weight, and feature access.
            These perks are yours because of <span className="font-semibold text-cyan-400">your own activity</span>, not investment returns.
          </p>
          {progress && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-400">
                You are currently <span className="font-bold text-amber-400">Level {progress.level}</span>
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {LEVEL_PERKS.map((perk, idx) => {
            const unlocked = progress ? progress.level >= perk.level : false;
            const categoryColors: Record<string, string> = {
              fee: 'border-emerald-500/40 bg-emerald-500/5',
              governance: 'border-violet-500/40 bg-violet-500/5',
              feature: 'border-cyan-500/40 bg-cyan-500/5',
              status: 'border-amber-400/40 bg-amber-400/5',
            };
            const categoryLabels: Record<string, string> = {
              fee: 'Fee Discount',
              governance: 'Governance',
              feature: 'Feature Access',
              status: 'Status',
            };

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  unlocked ? categoryColors[perk.category] : 'border-zinc-800 bg-zinc-950 opacity-50'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                  unlocked ? 'bg-zinc-900' : 'bg-zinc-900 grayscale'
                }`}>
                  {perk.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-bold ${unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                      {perk.title}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      unlocked ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-600'
                    }`}>
                      {categoryLabels[perk.category]}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs ${unlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {perk.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`mb-0.5 text-xs font-bold ${unlocked ? 'text-amber-400' : 'text-zinc-600'}`}>
                    Level {perk.level}
                  </div>
                  {unlocked ? (
                    <span className="text-xs font-semibold text-emerald-400">✓ Unlocked</span>
                  ) : (
                    <span className="text-xs text-zinc-600">Locked</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-amber-400">ℹ️</span>
            <span>
              Level perks are earned through <strong className="text-zinc-200">your own platform activity</strong> —
              completing quests, maintaining streaks, sending messages, and participating in governance.
              They are utility benefits, not investment returns.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
