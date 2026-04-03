'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original headhunter page

export function ActivityTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <Users className="w-5 h-5 text-blue-500" />
    Referral Activity
    </h2>

    <div className="space-y-3">
    {recentActivity.length === 0 ? (
    <div className="text-center py-12">
    <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
    <div className="text-lg font-semibold text-zinc-400 mb-2">No referrals yet</div>
    <div className="text-sm text-zinc-500">Share your link to start earning points!</div>
    </div>
    ) : (
    recentActivity.map((activity) => (
    <div
    key={activity.id}
    className="flex items-center justify-between p-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-700 transition-colors"
    >
    <div className="flex items-center gap-4">
    {/* Type Badge */}
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
    activity.type === 'merchant' ? 'bg-purple-600/20' : 'bg-blue-500/20'
    }`}>
    {activity.type === 'merchant' ? '🏪' : '👤'}
    </div>

    {/* Info */}
    <div>
    <div className="flex flex-wrap items-center gap-2 mb-1">
    <span className="font-mono text-white text-xs sm:text-sm truncate max-w-25 sm:max-w-45">{activity.address}</span>
    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
    activity.status === 'credited'
    ? 'bg-emerald-500/20 text-emerald-500'
    : 'bg-orange-500/20 text-orange-500'
    }`}>
    {activity.status === 'credited' ? '✓ Credited' : '⏳ Pending'}
    </span>
    </div>
    <div className="text-xs text-zinc-400">
    {new Date(activity.timestamp).toLocaleDateString()} • {activity.type === 'merchant' ? 'Merchant' : 'User'} referral
    </div>
    </div>
    </div>

    {/* Points */}
    <div className="text-right">
    <div className="text-lg font-bold text-amber-400">+{activity.points}</div>
    <div className="text-xs text-zinc-400">points</div>
    </div>
    </div>
    ))
    )}
    </div>
  </div>
  </div>
    </div>
  );
}
