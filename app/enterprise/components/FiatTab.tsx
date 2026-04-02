'use client';

import { useState } from 'react';
import { ArrowUpDown, CreditCard } from 'lucide-react';

import { LivePriceDisplay } from './LivePriceDisplay';

export function FiatTab({ isConnected: _isConnected }: { isConnected: boolean }) {
  const [rampType, setRampType] = useState<'on' | 'off'>('on');

  const providers = [
    { name: 'Bank Transfer', fee: '0.5%', time: '1-3 days', status: 'Available' },
    { name: 'Card Payment', fee: '2.5%', time: 'Instant', status: 'Available' },
    { name: 'Wire Transfer', fee: '0.1%', time: '1-2 days', status: 'Available' },
  ];

  return (
    <div className="space-y-8">
      {/* Fiat Overview */}
      <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 border border-green-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <CreditCard className="w-12 h-12 text-green-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Fiat On/Off Ramp</h2>
            <p className="text-zinc-400">Convert between fiat currencies and VFIDE</p>
          </div>
        </div>
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
          <p className="text-green-400 text-sm font-bold">Operational</p>
          <p className="text-zinc-400 text-sm">Fiat routing is available via integrated providers.</p>
        </div>
      </div>

      {/* Ramp Type Toggle */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setRampType('on')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            rampType === 'on'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <ArrowUpDown className="inline mr-2" size={18} />
          Buy VFIDE (On-Ramp)
        </button>
        <button
          onClick={() => setRampType('off')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            rampType === 'off'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <ArrowUpDown className="inline mr-2" size={18} />
          Sell VFIDE (Off-Ramp)
        </button>
      </div>

      {/* Providers */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Available Providers</h3>
        <div className="space-y-4">
          {providers.map((provider, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg opacity-50">
              <div>
                <div className="text-zinc-100 font-bold">{provider.name}</div>
                <div className="text-xs text-zinc-400">Fee: {provider.fee} | Time: {provider.time}</div>
              </div>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                {provider.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Info */}
      <LivePriceDisplay />
    </div>
  );
}
