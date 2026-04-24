'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { CheckCircle, XCircle, Search, Loader2 } from 'lucide-react';

type VerifyResult = 'valid' | 'invalid' | null;

export function VerifyTab() {
  const [addressInput, setAddressInput] = useState('');
  const [result, setResult] = useState<VerifyResult>(null);
  const [loading, setLoading] = useState(false);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const addr = addressInput.trim();
      setResult(ethers.isAddress(addr) ? 'valid' : 'invalid');
    } catch {
      setResult('invalid');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Search size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">Verify Paper Wallet</h3>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Ethereum Address</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  font-mono focus:outline-none focus:border-cyan-500/50"
             
              value={addressInput}
              onChange={(e) => { setAddressInput(e.target.value); setResult(null); }}
            />
          </div>
          <div>
            <p className="text-xs text-amber-300/90 mt-1">
              Private-key verification on web pages is intentionally disabled. Verify secret material only in offline wallet tooling.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        {result === 'valid' && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-400" />
              <p className="text-green-400 font-semibold text-sm">Valid</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Address format is valid.</p>
          </div>
        )}
        {result === 'invalid' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className="text-red-400" />
              <p className="text-red-400 font-semibold text-sm">Invalid</p>
            </div>
            <p className="text-xs text-gray-400">The address format is invalid.</p>
          </div>
        )}
      </div>
    </div>
  );
}
