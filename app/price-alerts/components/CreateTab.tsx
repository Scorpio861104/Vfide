'use client';

import { useState } from 'react';
import { BellPlus, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface PriceAlert {
  id: string;
  token: string;
  targetPrice: number;
  direction: 'above' | 'below';
  active: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'vfide_price_alerts';

function loadAlerts(): PriceAlert[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function CreateTab() {
  const [form, setForm] = useState({ token: 'VFIDE', targetPrice: '', direction: 'above' as 'above' | 'below' });
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const alert: PriceAlert = {
      id: Date.now().toString(),
      token: form.token,
      targetPrice: parseFloat(form.targetPrice),
      direction: form.direction,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const existing = loadAlerts();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, alert]));
    window.dispatchEvent(new Event('storage'));
    setSaved(true);
    setTimeout(() => { setSaved(false); setForm((f) => ({ ...f, targetPrice: '' })); }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BellPlus size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">New Price Alert</h3>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
              value={form.token}
              onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
            >
              {['VFIDE', 'USDC', 'ETH', 'BTC'].map((t) => <option key={t} className="bg-gray-900">{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: 'above' }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  form.direction === 'above'
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : 'bg-white/3 border-white/10 text-gray-400'
                }`}
              >
                <TrendingUp size={13} /> Above
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: 'below' }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  form.direction === 'below'
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-white/3 border-white/10 text-gray-400'
                }`}
              >
                <TrendingDown size={13} /> Below
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Target Price (USD)</label>
            <input
              required
              type="number"
              min="0.000001"
              step="any"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
             
              value={form.targetPrice}
              onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))}
            />
          </div>

          {saved ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={14} /> Alert saved
            </div>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors"
            >
              <BellPlus size={14} /> Create Alert
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
