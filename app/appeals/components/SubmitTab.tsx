'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Send, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const CATEGORIES = ['proof-score', 'transaction-dispute', 'loan-default', 'merchant-flag', 'other'];

export function SubmitTab() {
  const { address } = useAccount();
  const [form, setForm] = useState({ subject: '', category: 'proof-score', details: '', txHash: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          subject: form.subject,
          category: form.category,
          details: form.txHash
            ? `${form.details}\n\nTransaction Hash: ${form.txHash}`
            : form.details,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Submission failed');
      }
      setSuccess(true);
      setForm({ subject: '', category: 'proof-score', details: '', txHash: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Send size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to submit an appeal.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle size={48} className="text-green-400 mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">Appeal Submitted</h3>
        <p className="text-gray-400 text-sm mb-6">Your appeal has been received. The SEER committee will review it within 3–5 business days.</p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">Submit an Appeal</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-gray-900 capitalize">{c.replace(/-/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Subject</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
             
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Transaction Hash <span className="text-gray-600">(optional)</span></label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  font-mono focus:outline-none focus:border-cyan-500/50"
             
              value={form.txHash}
              onChange={(e) => setForm((f) => ({ ...f, txHash: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Details</label>
            <textarea
              required
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50 resize-none"
             
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? 'Submitting…' : 'Submit Appeal'}
          </button>
        </form>
      </div>
    </div>
  );
}
