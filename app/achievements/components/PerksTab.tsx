'use client';

import { LEVEL_PERKS } from '@/lib/gamification';

export function PerksTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Level Perks</h3>
        <p className="text-gray-400">Every milestone unlocks better fee treatment, governance reach, or service access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEVEL_PERKS.map((perk) => (
          <div key={`${perk.level}-${perk.title}`} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-cyan-300 text-sm font-semibold">Level {perk.level}</div>
            <h4 className="text-lg font-bold text-white mt-1">{perk.title}</h4>
            <p className="text-sm text-gray-400 mt-2">{perk.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
