'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

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

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function ActiveTab() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const refresh = useCallback(() => {
    setAlerts(loadAlerts().filter((a) => a.active));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [refresh]);

  useEffect(() => {
    setPriceLoading(true);
    fetch('/api/crypto/price')
      .then((r) => r.json())
      .then((d) => setCurrentPrice(d.price ?? d.usdPrice ?? null))
      .finally(() => setPriceLoading(false));
  }, []);

  function toggle(id: string) {
    const all = loadAlerts();
    const updated = all.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    saveAlerts(updated);
    refresh();
  }

  function remove(id: string) {
    const all = loadAlerts();
    saveAlerts(all.filter((a) => a.id !== id));
    refresh();
  }

  return (
    <div className="space-y-4">
      {currentPrice !== null && (
        <div className="bg-white/3 border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-sm text-gray-400">Current VFIDE Price:</p>
          <p className="text-sm text-white font-bold">${currentPrice.toFixed(4)}</p>
        </div>
      )}
      {priceLoading && !currentPrice && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={12} className="animate-spin" /> Fetching price…
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center bg-white/3 border border-white/10 rounded-2xl">
          <Bell size={32} className="text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No active alerts.</p>
          <p className="text-gray-500 text-xs mt-1">Use the Create tab to set up price alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const triggered = currentPrice !== null && (
              (a.direction === 'above' && currentPrice >= a.targetPrice) ||
              (a.direction === 'below' && currentPrice <= a.targetPrice)
            );
            return (
              <div key={a.id} className={`p-4 rounded-xl border ${
                triggered ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/3 border-white/10'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {a.direction === 'above' ? (
                      <TrendingUp size={14} className="text-green-400" />
                    ) : (
                      <TrendingDown size={14} className="text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-white font-semibold">{a.token} {a.direction} ${a.targetPrice.toFixed(4)}</p>
                      <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {triggered && <span className="text-xs text-cyan-400 font-semibold">⚡ Triggered</span>}
                    <button onClick={() => toggle(a.id)} className="text-gray-500 hover:text-yellow-400 transition-colors">
                      {a.active ? <Bell size={14} /> : <BellOff size={14} />}
                    </button>
                    <button onClick={() => remove(a.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
