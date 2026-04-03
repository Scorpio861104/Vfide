'use client';

import { Footer } from '@/components/layout/Footer';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';

type TabId = 'active' | 'history';

type AlertItem = {
  id: string;
  symbol: string;
  target: string;
  note: string;
  status: 'Active' | 'Triggered';
};

const TAB_LABELS: Record<TabId, string> = { active: 'Active Alerts', history: 'History' };
const TAB_IDS: TabId[] = ['active', 'history'];

const MARKET_OVERVIEW = [
  { symbol: 'VFIDE', price: '$0.08', delta: '+4.2%' },
  { symbol: 'ETH', price: '$3,640', delta: '-1.1%' },
];

export default function PriceAlertsPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [symbol, setSymbol] = useState('VFIDE');
  const [target, setTarget] = useState('0.10');
  const [note, setNote] = useState('VFIDE momentum watch');
  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: 'vfide-initial', symbol: 'VFIDE', target: '0.10', note: 'Treasury watch', status: 'Active' },
    { id: 'eth-initial', symbol: 'ETH', target: '3500', note: 'Macro support zone', status: 'Active' },
  ]);

  const alertHistory = useMemo(
    () => alerts.map((alert, index) => ({ ...alert, status: index === 0 ? 'Triggered' as const : alert.status })),
    [alerts]
  );

  const openCreateForm = () => {
    setShowCreateForm(true);
  };

  const openPreset = (presetSymbol: string, presetTarget: string, presetNote: string) => {
    setSymbol(presetSymbol);
    setTarget(presetTarget);
    setNote(presetNote);
    setShowCreateForm(true);
  };

  const handleCreateAlert = () => {
    setAlerts((current) => [
      {
        id: `${symbol}-${target}-${current.length}`,
        symbol,
        target,
        note,
        status: 'Active',
      },
      ...current,
    ]);
    setShowCreateForm(false);
    setActiveTab('active');
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">Price Alerts</h1>
          </motion.div>
          <p className="text-white/60">Price Monitoring for VFIDE, ETH, and other tracked market signals.</p>

          <div className="flex flex-wrap gap-2">
            {TAB_IDS.map(id => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {TAB_LABELS[id]}
              </button>
            ))}
            <button
              type="button"
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all bg-white/5 text-gray-200 border border-white/10 hover:text-white"
            >
              Create Alert +
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <h2 className="text-2xl font-bold text-white mb-3">Market Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MARKET_OVERVIEW.map((market) => (
                <div key={market.symbol} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-gray-400">{market.symbol}</div>
                  <div className="text-2xl font-bold text-white mt-1">{market.price}</div>
                  <div className="text-sm text-cyan-300 mt-1">{market.delta}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openPreset('ETH', '3500', 'ETH buying opportunity')}
                className="px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-semibold"
              >
                ETH under $3,500
              </button>
              <button
                type="button"
                onClick={() => openPreset('VFIDE', '0.10', 'VFIDE breakout watch')}
                className="px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm font-semibold"
              >
                VFIDE above $0.10
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white">Create Price Alert</h2>
              <p className="text-sm text-gray-400">Alerts will be associated with {address ?? 'your wallet once connected'}.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
                <input
                  type="number"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCreateAlert}
                  className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
                >
                  Create Alert
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === 'active' ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">{alert.symbol}</div>
                    <div className="text-sm text-gray-400">Target {alert.target} · {alert.note}</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">{alert.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {alertHistory.map((alert) => (
                <div key={`${alert.id}-history`} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">{alert.symbol}</div>
                    <div className="text-sm text-gray-400">{alert.note}</div>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-gray-200">{alert.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
