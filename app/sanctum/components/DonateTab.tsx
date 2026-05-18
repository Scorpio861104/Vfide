'use client';

import { useState } from 'react';
import { AlertTriangle, Heart } from 'lucide-react';

import { safeParseFloat } from '@/lib/validation';

export function DonateTab({ isConnected }: { isConnected: boolean }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isConnected) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 text-pink-400/50" />
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Connect to Donate</h2>
        <p className="text-zinc-400">Connect your wallet to make a direct donation to The Sanctum</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8">
        <div className="text-center mb-8">
          <Heart className="w-12 h-12 mx-auto mb-4 text-pink-400" />
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Make a Donation</h2>
          <p className="text-zinc-400">Direct donations to The Sanctum charity fund</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-zinc-400 text-sm">Amount (VFIDE)</label>
              <button
                onClick={() => setAmount('10000')}
                className="text-xs text-pink-400 hover:text-pink-300 font-bold"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) =>  setAmount(e.target.value)}
             
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100  focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm transition-colors"
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-2 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) =>  setNote(e.target.value)}
             
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100  focus:border-pink-500 focus:outline-none"
            />
          </div>

          <button
            disabled={!amount || safeParseFloat(amount, 0) <= 0}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all"
          >
            Donate {amount ? `${safeParseFloat(amount, 0).toLocaleString()} VFIDE` : ''}
          </button>

          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-400">
                Donations are permanent and non-refundable. Funds are distributed to DAO-approved charities only.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
