'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function CreateTab() {
  const { address } = useAccount();
  const [form, setForm] = useState({
    lenderAddress: '',
    principal: '',
    durationDays: '7',
    interestBps: '100',
    collateralPct: '110',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/flashloans/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderAddress: form.lenderAddress,
          principal: parseFloat(form.principal),
          durationDays: parseInt(form.durationDays),
          interestBps: parseInt(form.interestBps),
          collateralPct: parseInt(form.collateralPct),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to create escrow');
      }
      setSuccess(true);
      setForm({ lenderAddress: '', principal: '', durationDays: '7', interestBps: '100', collateralPct: '110' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Plus size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to create an escrow.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle size={48} className="text-green-400 mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">Escrow Created</h3>
        <p className="text-gray-400 text-sm mb-6">Your escrow lane has been drafted and awaits funding.</p>
        <button onClick={() => setSuccess(false)} className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors">
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plus size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">New Escrow</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Counterparty (Lender) Address</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  font-mono focus:outline-none focus:border-cyan-500/50"
             
              value={form.lenderAddress}
              onChange={(e) => setForm((f) => ({ ...f, lenderAddress: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Principal (VFIDE)</label>
              <input
                required
                type="number"
                min="1"
                step="any"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
               
                value={form.principal}
                onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Duration (days)</label>
              <input
                required
                type="number"
                min="1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Interest (bps)</label>
              <input
                required
                type="number"
                min="0"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
                value={form.interestBps}
                onChange={(e) => setForm((f) => ({ ...f, interestBps: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-0.5">{(parseInt(form.interestBps || '0') / 100).toFixed(2)}%</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Collateral %</label>
              <input
                required
                type="number"
                min="100"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
                value={form.collateralPct}
                onChange={(e) => setForm((f) => ({ ...f, collateralPct: e.target.value }))}
              />
            </div>
          </div>

          {error && <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={14} /> {error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? 'Creating…' : 'Create Escrow'}
          </button>
        </form>
      </div>
    </div>
  );
}
