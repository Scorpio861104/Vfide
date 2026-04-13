'use client';

import { useState, FormEvent } from 'react';
import { Loader2, Vote } from 'lucide-react';
import { useAccount } from 'wagmi';

export function CreateTab() {
  const { address } = useAccount();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Vote size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to submit a governance proposal.</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, proposerAddress: address }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to submit proposal');
      }
      setSuccess(true);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">New Governance Proposal</h3>
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            Proposal submitted successfully. It will appear in the proposals list after on-chain confirmation.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
             
              required
              maxLength={200}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white  text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
             
              required
              rows={6}
              maxLength={5000}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white  text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <p className="text-gray-600 text-xs mt-1 text-right">{description.length} / 5000</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
            {submitting ? 'Submitting...' : 'Submit Proposal'}
          </button>
        </form>
      </div>
    </div>
  );
}
