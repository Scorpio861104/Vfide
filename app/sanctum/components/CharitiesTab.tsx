'use client';

import { CheckCircle, ExternalLink } from 'lucide-react';

export function CharitiesTab() {
  const charities = [
    { name: 'Save the Children', category: 'Children', verified: true, totalReceived: 25000, status: 'active' },
    { name: 'Doctors Without Borders', category: 'Healthcare', verified: true, totalReceived: 18000, status: 'active' },
    { name: 'Ocean Cleanup', category: 'Environment', verified: true, totalReceived: 15000, status: 'active' },
    { name: 'Code.org', category: 'Education', verified: true, totalReceived: 12000, status: 'active' },
    { name: 'World Wildlife Fund', category: 'Wildlife', verified: true, totalReceived: 10000, status: 'active' },
    { name: 'Habitat for Humanity', category: 'Housing', verified: true, totalReceived: 8000, status: 'active' },
    { name: 'Water.org', category: 'Water Access', verified: true, totalReceived: 7000, status: 'active' },
    { name: 'Khan Academy', category: 'Education', verified: true, totalReceived: 5000, status: 'active' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-100">Approved Charities</h2>
        <div className="text-sm text-zinc-400">DAO-verified organizations</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charities.map((charity, idx) => (
          <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-pink-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-100">{charity.name}</h3>
                  {charity.verified && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <div className="text-sm text-zinc-400">{charity.category}</div>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                {charity.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-pink-400">{charity.totalReceived.toLocaleString()}</div>
                <div className="text-xs text-zinc-400">VFIDE received</div>
              </div>
              <button className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
                View Details <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
        <p className="text-blue-400 text-sm">
          Want to propose a new charity? Submit a governance proposal in the DAO section.
        </p>
      </div>
    </div>
  );
}
