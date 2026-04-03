'use client';

import { Footer } from '@/components/layout/Footer';

const TIERS = [
  { range: '0–3999', label: 'Emerging', note: 'Build trust with consistent activity and secure behavior.' },
  { range: '4000–6999', label: 'Trusted', note: 'Unlock broader platform access and lower-friction flows.' },
  { range: '7000–10000', label: 'Elite', note: 'Highest trust band for governance and premium operations.' },
];

export default function ProofScorePage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">ProofScore</h1>
            <p className="text-white/60">Understand how VFIDE reputation works and what unlocks as your score improves.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <div key={tier.range} className="rounded-2xl border border-white/10 bg-white/3 p-5">
                <div className="text-sm text-cyan-300 font-semibold">{tier.range}</div>
                <h2 className="text-xl font-bold text-white mt-1">{tier.label}</h2>
                <p className="text-sm text-gray-400 mt-2">{tier.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
