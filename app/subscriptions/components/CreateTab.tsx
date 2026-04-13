'use client';

import { useState, FormEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useAccount } from 'wagmi';

const INTERVALS = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
type Interval = typeof INTERVALS[number];

export function CreateTab() {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [interval, setInterval] = useState<Interval>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Plus size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to create a subscription.</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, recipient, amount, label, interval }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to create subscription');
      }
      setSuccess(true);
      setRecipient('');
      setAmount('');
      setLabel('');
      setInterval('monthly');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">New Subscription</h3>
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            Subscription created successfully.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
             
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white  text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
             
              required
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white  text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (VFIDE)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
               
                required
                min="0.000001"
                step="any"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white  text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value as Interval)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              >
                {INTERVALS.map((i) => (
                  <option key={i} value={i} className="bg-gray-900 capitalize">{i}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {submitting ? 'Creating...' : 'Create Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}
