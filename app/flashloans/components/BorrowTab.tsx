'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Zap, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface FormState {
  lenderAddress: string;
  principal: string;
  durationDays: string;
  interestBps: string;
  collateralPct: string;
}

const DEFAULT_FORM: FormState = {
  lenderAddress: '',
  principal: '',
  durationDays: '30',
  interestBps: '200',
  collateralPct: '120',
};

export function BorrowTab() {
  const { address } = useAccount();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const interestPct = form.interestBps ? (parseInt(form.interestBps, 10) / 100).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) { setError('Connect your wallet first.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/flashloans/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderAddress: form.lenderAddress,
          principal: Number(form.principal),
          durationDays: Number(form.durationDays),
          interestBps: Number(form.interestBps),
          collateralPct: Number(form.collateralPct),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setForm(DEFAULT_FORM);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create loan request.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle size={40} className="text-green-400 mb-3" />
        <h3 className="text-white font-semibold mb-1">Loan request submitted!</h3>
        <p className="text-gray-400 text-sm mb-4">Your flash loan request has been created and is awaiting lender acceptance.</p>
        <button onClick={() => setSuccess(false)}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors">
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-yellow-400" />
        <h3 className="text-white font-semibold text-sm">New Flash Loan Request</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="flashloan-lender-address" className="block text-xs text-gray-400 mb-1">Lender Address</label>
          <input
            id="flashloan-lender-address"
            type="text" value={form.lenderAddress} onChange={(e) => set('lenderAddress', e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="flashloan-principal" className="block text-xs text-gray-400 mb-1">Principal (VFIDE)</label>
            <input
              id="flashloan-principal"
              type="number" value={form.principal} onChange={(e) => set('principal', e.target.value)}
              min="1" required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label htmlFor="flashloan-duration-days" className="block text-xs text-gray-400 mb-1">Duration (days)</label>
            <input
              id="flashloan-duration-days"
              type="number" value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)}
              min="1" max="365" required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="flashloan-interest-bps" className="block text-xs text-gray-400 mb-1">Interest (bps) — {interestPct}%</label>
            <input
              id="flashloan-interest-bps"
              type="number" value={form.interestBps} onChange={(e) => set('interestBps', e.target.value)}
              min="0" max="10000" required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label htmlFor="flashloan-collateral-pct" className="block text-xs text-gray-400 mb-1">Collateral (%)</label>
            <input
              id="flashloan-collateral-pct"
              type="number" value={form.collateralPct} onChange={(e) => set('collateralPct', e.target.value)}
              min="100" max="500" required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit" disabled={loading || !address}
          className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 font-semibold text-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Submitting…' : 'Request Flash Loan'}
        </button>
      </form>
    </div>
  );
}
