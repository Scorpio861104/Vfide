'use client';

import { Footer } from '@/components/layout/Footer';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { safeLocalStorage } from '@/lib/utils';
import { ActiveTab, type PriceAlertItem } from './components/ActiveTab';
import { CreateTab } from './components/CreateTab';
import { HistoryTab } from './components/HistoryTab';

type TabId = 'active' | 'history';

const TAB_LABELS: Record<TabId, string> = { active: 'Active Alerts', history: 'History' };
const TAB_IDS: TabId[] = ['active', 'history'];
const STORAGE_PREFIX = 'vfide_price_alerts_';

const DEFAULT_ALERTS: PriceAlertItem[] = [
  { id: 'vfide-initial', symbol: 'VFIDE', target: '0.10', note: 'Treasury watch', status: 'Active' },
  { id: 'eth-initial', symbol: 'ETH', target: '3500', note: 'Macro support zone', status: 'Active' },
];

const MARKET_OVERVIEW = [
  { symbol: 'VFIDE', price: '$0.08', delta: '+4.2%' },
  { symbol: 'ETH', price: '$3,640', delta: '-1.1%' },
];

function cloneDefaultAlerts(): PriceAlertItem[] {
  return DEFAULT_ALERTS.map((alert) => ({ ...alert }));
}

function parseStoredAlerts(raw: string | null): PriceAlertItem[] {
  if (!raw) return cloneDefaultAlerts();

  try {
    const parsed = JSON.parse(raw) as PriceAlertItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cloneDefaultAlerts();
    }

    return parsed.filter((alert) => Boolean(alert?.id && alert?.symbol && alert?.target && alert?.note));
  } catch {
    return cloneDefaultAlerts();
  }
}

export default function PriceAlertsPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [symbol, setSymbol] = useState('VFIDE');
  const [target, setTarget] = useState('0.10');
  const [note, setNote] = useState('VFIDE momentum watch');
  const [alerts, setAlerts] = useState<PriceAlertItem[]>(cloneDefaultAlerts);

  const storageKey = `${STORAGE_PREFIX}${address?.toLowerCase() || 'guest'}`;

  useEffect(() => {
    setAlerts(parseStoredAlerts(safeLocalStorage.getItem(storageKey)));
  }, [storageKey]);

  useEffect(() => {
    safeLocalStorage.setItem(storageKey, JSON.stringify(alerts));
  }, [alerts, storageKey]);

  const alertHistory = useMemo(
    () => alerts.filter((alert) => alert.status === 'Triggered'),
    [alerts]
  );

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === 'Active'),
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
    const normalizedSymbol = symbol.trim().toUpperCase();
    const normalizedTarget = target.trim();
    const normalizedNote = note.trim();

    if (!normalizedSymbol || !normalizedTarget || !normalizedNote) {
      return;
    }

    setAlerts((current) => [
      {
        id: `${normalizedSymbol}-${normalizedTarget}-${Date.now()}`,
        symbol: normalizedSymbol,
        target: normalizedTarget,
        note: normalizedNote,
        status: 'Active',
      },
      ...current,
    ]);
    setShowCreateForm(false);
    setActiveTab('active');
  };

  const handleTriggerAlert = (id: string) => {
    setAlerts((current) => current.map((alert) =>
      alert.id === id ? { ...alert, status: 'Triggered' } : alert
    ));
  };

  const handleRestoreAlert = (id: string) => {
    setAlerts((current) => current.map((alert) =>
      alert.id === id ? { ...alert, status: 'Active' } : alert
    ));
    setActiveTab('active');
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
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
            {TAB_IDS.map((id) => (
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

          {showCreateForm ? (
            <CreateTab
              address={address}
              symbol={symbol}
              target={target}
              note={note}
              onSymbolChange={setSymbol}
              onTargetChange={setTarget}
              onNoteChange={setNote}
              onCreate={handleCreateAlert}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : null}

          {activeTab === 'active' ? (
            <ActiveTab
              alerts={activeAlerts}
              onTrigger={handleTriggerAlert}
              onRemove={handleRemoveAlert}
            />
          ) : (
            <HistoryTab
              alerts={alertHistory}
              onRestore={handleRestoreAlert}
              onRemove={handleRemoveAlert}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
