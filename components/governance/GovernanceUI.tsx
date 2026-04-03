'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { StatCard } from './extracted/StatCard';
import { ProposalCard } from './extracted/ProposalCard';
import { DelegationItem } from './extracted/DelegationItem';

export default function GovernanceUI() {
  const [view, setView] = useState<'proposals' | 'delegations'>('proposals');
  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        {(['proposals', 'delegations'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl font-bold text-sm capitalize ${
              view === v ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10'
            }`}>{v}</button>
        ))}
      </div>
      {/* TODO: Wire to governance hooks */}
    </div>
  );
}
