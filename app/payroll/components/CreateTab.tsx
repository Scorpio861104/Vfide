'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const TOKENS = ['VFIDE', 'USDC', 'USDT', 'ETH'];

export function CreateTab() {
  const { address } = useAccount();
  const [form, setForm] = useState({
    recipientAddress: '',
    token: 'VFIDE',
    totalAmount: '',
    durationDays: '30',
    startDate: new Date().toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSubmitting(true);
    setError(null);

    const totalAmount = parseFloat(form.totalAmount);
    const durationSeconds = parseInt(form.durationDays) * 86400;
    const startTime = new Date(form.startDate).toISOString();
    const endTime = new Date(new Date(form.startDate).getTime() + durationSeconds * 1000).toISOString();
    const ratePerSecond = totalAmount / durationSeconds;

    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAddress: address,
          recipientAddress: form.recipientAddress,
          token: form.token,
          totalAmount,
          ratePerSecond,
          startTime,
          endTime,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to create stream');
      }
      setSuccess(true);
      setForm({ recipientAddress: '', token: 'VFIDE', totalAmount: '', durationDays: '30', startDate: new Date().toISOString().slice(0, 16) });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Plus size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to create a payroll stream.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle size={48} className="text-green-400 mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">Stream Created</h3>
        <p className="text-gray-400 text-sm mb-6">The payroll stream has been created and is now active.</p>
        <button onClick={() => setSuccess(false)} className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors">
          Create Another
        </button>
      </div>
    );
  }

  const rate = form.totalAmount && form.durationDays
    ? (parseFloat(form.totalAmount) / (parseInt(form.durationDays) * 86400)).toExponential(4)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plus size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">New Payroll Stream</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Recipient Address</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  font-mono focus:outline-none focus:border-cyan-500/50"
             
              value={form.recipientAddress}
              onChange={(e) => setForm((f) => ({ ...f, recipientAddress: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
              >
                {TOKENS.map((t) => <option key={t} className="bg-gray-900">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Total Amount</label>
              <input
                required
                type="number"
                min="0.000001"
                step="any"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
               
                value={form.totalAmount}
                onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Start Date</label>
              <input
                type="datetime-local"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
          </div>

          {rate && (
            <p className="text-xs text-gray-500">
              Rate: <span className="text-cyan-400">{rate} {form.token}/second</span>
            </p>
          )}

          {error && <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={14} /> {error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? 'Creating…' : 'Create Stream'}
          </button>
        </form>
      </div>
    </div>
  );
}
