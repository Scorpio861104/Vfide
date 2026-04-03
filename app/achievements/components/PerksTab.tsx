'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original achievements page

export function PerksTab() {
  return (
    <div className="space-y-6">
      <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-4"
    >
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-4">
    <h3 className="text-xl font-bold text-zinc-100 mb-2">Level Perks</h3>
    <p className="text-sm text-zinc-400">
    Every level you earn unlocks real platform benefits — fee discounts, governance voting weight, and feature access.
    These perks are yours because of <span className="text-cyan-400 font-semibold">your own activity</span>, not investment returns.
    </p>
    {progress && (
    <div className="mt-3 flex items-center gap-2 text-sm">
    <Zap className="w-4 h-4 text-amber-400" />
    <span className="text-zinc-400">You are currently <span className="text-amber-400 font-bold">Level {progress.level}</span></span>
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
    unlocked
    ? categoryColors[perk.category]
    : 'border-zinc-800 bg-zinc-950 opacity-50'
    }`}
    >
    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
    unlocked ? 'bg-zinc-900' : 'bg-zinc-900 grayscale'
    }`}>
    {perk.icon}
    </div>
    <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
    <span className={`font-bold text-sm ${unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
    {perk.title}
    </span>
    <span className={`text-xs px-2 py-0.5 rounded-full ${
    unlocked ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-600'
    }`}>
    {categoryLabels[perk.category]}
    </span>
    </div>
    <p className={`text-xs mt-0.5 ${unlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>
    {perk.description}
    </p>
    </div>
    <div className="shrink-0 text-right">
    <div className={`text-xs font-bold mb-0.5 ${unlocked ? 'text-amber-400' : 'text-zinc-600'}`}>
    Level {perk.level}
    </div>
    {unlocked ? (
    <span className="text-xs text-emerald-400 font-semibold">✓ Unlocked</span>
    ) : (
    <span className="text-xs text-zinc-600">Locked</span>
    )}
    </div>
    </motion.div>
    );
    })}
    </div>

    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-400">
    <div className="flex items-start gap-2">
    <span className="text-amber-400 shrink-0 mt-0.5">ℹ️</span>
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
