'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, DollarSign, QrCode, Clock, Check, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { queueCharge, getPendingCharges, removeCharge, syncPendingCharges, setupAutoSync, type PendingCharge } from '@/lib/offline/offlineQueue';

function generateId() {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function POSPage() {
  const { address } = useAccount();
  const [isOnline, setIsOnline] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOn = () => setIsOnline(true);
    const onOff = () => setIsOnline(false);
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => { window.removeEventListener('online', onOn); window.removeEventListener('offline', onOff); };
  }, []);

  // Load pending charges
  const refreshPending = useCallback(async () => {
    const charges = await getPendingCharges();
    setPendingCharges(charges.filter(c => c.merchantAddress === address));
  }, [address]);

  useEffect(() => { refreshPending(); }, [refreshPending]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!address) return;
    return setupAutoSync(address, (result) => {
      setLastAction(`Synced ${result.synced} charge(s)${result.failed ? `, ${result.failed} failed` : ''}`);
      refreshPending();
    });
  }, [address, refreshPending]);

  const handleCreateCharge = async () => {
    if (!amount || parseFloat(amount) <= 0 || !address) return;

    const charge: PendingCharge = {
      id: generateId(),
      amount,
      description: description.trim(),
      currency: 'VFIDE',
      createdAt: Date.now(),
      status: 'queued',
      merchantAddress: address,
    };

    if (isOnline) {
      // TODO: Online flow — call /api/pos/charge, get QR code, show payment screen
      // For now, queue and sync immediately
      await queueCharge(charge);
      await syncPendingCharges(address);
      setLastAction(`Charge of $${amount} created`);
    } else {
      await queueCharge(charge);
      setLastAction(`Charge queued offline — will sync when back online`);
    }

    setAmount('');
    setDescription('');
    refreshPending();
  };

  const handleSync = async () => {
    if (!address) return;
    setIsSyncing(true);
    const result = await syncPendingCharges(address);
    setLastAction(`Synced ${result.synced}, failed ${result.failed}`);
    await refreshPending();
    setIsSyncing(false);
  };

  const handleDelete = async (id: string) => {
    await removeCharge(id);
    refreshPending();
  };

  const queuedCount = pendingCharges.filter(c => c.status === 'queued').length;

  return (
    <div className="min-h-screen bg-zinc-950 pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-lg">
        {/* Connection Status */}
        <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl mb-6 text-sm font-bold ${
          isOnline ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        }`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          {isOnline ? 'Online' : 'Offline — charges will queue'}
          {queuedCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 rounded text-xs">{queuedCount} queued</span>
          )}
        </div>

        {/* Charge Input */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="text-cyan-400" size={24} />
            New Charge
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Amount (VFIDE)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) =>  setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-2xl font-mono focus:border-cyan-500/50 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) =>  setDescription(e.target.value)}
                placeholder="e.g., 2x kente cloth"
                maxLength={200}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>

            <button
              onClick={handleCreateCharge}
              disabled={!amount || parseFloat(amount) <= 0 || !address}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <QrCode size={22} />
              {isOnline ? 'Create Charge' : 'Queue Charge (Offline)'}
            </button>
          </div>
        </div>

        {/* Status message */}
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 mb-4 text-cyan-400 text-sm text-center"
            >
              {lastAction}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending Queue */}
        {pendingCharges.length > 0 && (
          <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-amber-400" />
                Recent Charges
              </h3>
              {queuedCount > 0 && isOnline && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-bold disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  Sync
                </button>
              )}
            </div>

            <div className="space-y-2">
              {pendingCharges.slice(0, 20).map(charge => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      charge.status === 'synced' ? 'bg-emerald-500/20' :
                      charge.status === 'failed' ? 'bg-red-500/20' :
                      charge.status === 'syncing' ? 'bg-cyan-500/20' :
                      'bg-amber-500/20'
                    }`}>
                      {charge.status === 'synced' ? <Check size={14} className="text-emerald-400" /> :
                       charge.status === 'failed' ? <AlertCircle size={14} className="text-red-400" /> :
                       charge.status === 'syncing' ? <RefreshCw size={14} className="text-cyan-400 animate-spin" /> :
                       <Clock size={14} className="text-amber-400" />}
                    </div>
                    <div>
                      <div className="text-white font-mono font-bold text-sm">${parseFloat(charge.amount).toFixed(2)}</div>
                      {charge.description && <div className="text-gray-500 text-xs truncate max-w-[160px]">{charge.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      charge.status === 'synced' ? 'bg-emerald-500/20 text-emerald-400' :
                      charge.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {charge.status}
                    </span>
                    <button onClick={() => handleDelete(charge.id)} className="p-1 text-gray-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
