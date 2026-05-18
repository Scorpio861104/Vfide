'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, TrendingUp, TrendingDown, Bell } from 'lucide-react';

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

export function HistoryTab() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  const refresh = useCallback(() => {
    // History shows all alerts ever created (both active and inactive)
    setAlerts(loadAlerts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [refresh]);

  function clearAll() {
    if (!confirm('Clear all alert history?')) return;
    localStorage.removeItem(STORAGE_KEY);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Alert History</h3>
          {alerts.length > 0 && (
            <button onClick={clearAll} className="ml-auto text-xs text-red-400/70 hover:text-red-400 transition-colors">
              Clear all
            </button>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No alert history yet.</p>
            <p className="text-gray-500 text-xs mt-1">Create alerts and they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-lg">
                {a.direction === 'above' ? (
                  <TrendingUp size={14} className="text-green-400 flex-shrink-0" />
                ) : (
                  <TrendingDown size={14} className="text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{a.token} {a.direction} ${a.targetPrice.toFixed(4)}</p>
                  <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${
                  a.active
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-gray-500 bg-white/5 border-white/10'
                }`}>
                  {a.active ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
