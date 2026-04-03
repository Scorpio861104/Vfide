'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original headhunter page

export function DashboardTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
  {/* Referral Link */}
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <Share2 className="w-5 h-5 text-amber-400" />
    Your Referral Link
    </h2>
    <div className="flex gap-3 mb-4">
    <input
    type="text"
    value={referralLink}
    readOnly
    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
    />
    <button
    onClick={copyReferralLink}
    className="px-6 py-3 bg-amber-400 text-zinc-950 rounded-lg font-semibold hover:bg-orange-500 transition-colors flex items-center gap-2"
    >
    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
    {copied ? 'Copied!' : 'Copy'}
    </button>
    </div>

    {/* Share Buttons */}
    <div className="flex flex-wrap gap-2 sm:gap-3">
    {shareOptions.map((option) => (
    <a
    key={option.name}
    href={option.link}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex-1 ${option.color} hover:opacity-90 transition-opacity rounded-lg px-4 py-3 text-white font-semibold flex items-center justify-center gap-2`}
    >
    <option.icon className="w-5 h-5" />
    {option.name}
    </a>
    ))}
    </div>
  </div>

  {/* Community Recognition */}
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <Award className="w-5 h-5 text-purple-600" />
    Q{stats.currentQuarterNumber} Community Recognition
    </h2>

    <div className="bg-zinc-800 rounded-xl p-6 mb-4">
    <div className="text-center mb-4">
    <div className="text-sm text-zinc-400 mb-2">Your Current Rank</div>
    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-500 mb-2">#{stats.estimatedRank || '?'}</div>
    <div className="text-sm text-amber-400">
    {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? 'Top 20 Qualified ✨' : 'Keep recruiting to qualify!'}
    </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
    <div className="bg-zinc-900 rounded-lg p-4 text-center">
    <div className="text-sm text-zinc-400 mb-1">Points This Year</div>
    <div className="text-2xl font-bold text-amber-400">{stats.currentYearPoints}</div>
    </div>
    <div className="bg-zinc-900 rounded-lg p-4 text-center">
    <div className="text-sm text-zinc-400 mb-1">Quarterly Badge</div>
    <div className="text-2xl font-bold text-emerald-500">
    {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? '🏆 Earned' : '—'}
    </div>
    </div>
    </div>

    <div className="text-xs text-zinc-400 text-center mb-3">
    Top 20 recruiters each quarter earn the exclusive Headhunter governance badge
    </div>

    {/* What the badge does */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="bg-zinc-900 border border-violet-500/30 rounded-lg p-3 text-center">
    <div className="text-xl mb-1">🗳️</div>
    <div className="text-xs font-bold text-violet-400">+25% Voting Weight</div>
    <div className="text-xs text-zinc-500 mt-0.5">Governance votes count more</div>
    </div>
    <div className="bg-zinc-900 border border-cyan-500/30 rounded-lg p-3 text-center">
    <div className="text-xl mb-1">📋</div>
    <div className="text-xs font-bold text-cyan-400">Proposal Rights</div>
    <div className="text-xs text-zinc-500 mt-0.5">Submit DAO proposals directly</div>
    </div>
    <div className="bg-zinc-900 border border-amber-400/30 rounded-lg p-3 text-center">
    <div className="text-xl mb-1">👑</div>
    <div className="text-xs font-bold text-amber-400">Council Eligibility</div>
    <div className="text-xs text-zinc-500 mt-0.5">Can be elected to Community Council</div>
    </div>
    </div>
    </div>
  </div>

  {/* How It Works */}
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
    <div className="space-y-4">
    <div className="flex gap-4">
    <div className="shrink-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-zinc-950 font-bold">1</div>
    <div>
    <div className="font-semibold text-white mb-1">Share Your Link</div>
    <div className="text-sm text-zinc-400">Invite users and merchants using your unique referral link</div>
    </div>
    </div>
    <div className="flex gap-4">
    <div className="shrink-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950 font-bold">2</div>
    <div>
    <div className="font-semibold text-white mb-1">Earn Points</div>
    <div className="text-sm text-zinc-400">1 point per user (after $25 in vault) + 3 points per merchant (after 3 transactions)</div>
    </div>
    </div>
    <div className="flex gap-4">
    <div className="shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
    <div>
    <div className="font-semibold text-white mb-1">Compete for Top 20</div>
    <div className="text-sm text-zinc-400">Points accumulate all year, rankings evaluated quarterly</div>
    </div>
    </div>
    <div className="flex gap-4">
    <div className="shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
    <div>
    <div className="font-semibold text-white mb-1">Earn Recognition</div>
    <div className="text-sm text-zinc-400">Top 20 earn the exclusive Headhunter governance badge and community recognition</div>
    </div>
    </div>
    </div>

    <div className="mt-6 p-4 bg-amber-400/10 border border-amber-400/20 rounded-lg">
    <div className="flex items-start gap-3">
    <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
    <div className="text-sm text-zinc-400">
    <span className="text-amber-400 font-semibold">Pro Tip:</span> Maintain 60%+ ProofScore to participate. Dropping below 60% disqualifies you from the quarterly recognition!
    </div>
    </div>
    </div>
  </div>
  </div>
    </div>
  );
}
