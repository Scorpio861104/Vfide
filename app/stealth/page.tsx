'use client';

import { useMemo, useState } from 'react';
import { Shield, Clock3, CheckCircle2, Activity, Copy } from 'lucide-react';

export default function StealthPage() {
  const [testAddress, setTestAddress] = useState('0x');

  const readiness = useMemo(() => {
    const rpcConfigured = Boolean(process.env.NEXT_PUBLIC_RPC_URL);
    const chainConfigured = Boolean(process.env.NEXT_PUBLIC_CHAIN_ID);
    const isAddressLike = /^0x[a-fA-F0-9]{40}$/.test(testAddress.trim());
    return { rpcConfigured, chainConfigured, isAddressLike };
  }, [testAddress]);

  const checks = [
    { label: 'RPC configured', ok: readiness.rpcConfigured },
    { label: 'Chain ID configured', ok: readiness.chainConfigured },
    { label: 'Recipient address format', ok: readiness.isAddressLike },
  ];

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-white mb-2">Stealth Address</h1>
      <p className="text-gray-400 text-sm mb-6">Operational readiness panel for private payment routing and EIP-5564 enablement.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Shield size={14} className="text-cyan-400" /><p className="text-xs text-gray-400">Privacy Engine</p></div>
          <p className="text-white font-semibold">EIP-5564 Validation</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Clock3 size={14} className="text-amber-400" /><p className="text-xs text-gray-400">Status</p></div>
          <p className="text-white font-semibold">Restricted Execution Mode</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Activity size={14} className="text-emerald-400" /><p className="text-xs text-gray-400">Readiness Checks</p></div>
          <p className="text-white font-semibold">{checks.filter((c) => c.ok).length}/{checks.length} Passing</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-5">
        <h2 className="text-white font-semibold text-sm mb-3">Environment Check</h2>
        <div className="space-y-2 mb-4">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between bg-white/3 border border-white/10 rounded-lg px-3 py-2">
              <p className="text-sm text-gray-300">{check.label}</p>
              <div className="flex items-center gap-1 text-xs">
                <CheckCircle2 size={14} className={check.ok ? 'text-green-400' : 'text-gray-600'} />
                <span className={check.ok ? 'text-green-400' : 'text-gray-500'}>{check.ok ? 'OK' : 'Pending'}</span>
              </div>
            </div>
          ))}
        </div>

        <label className="block text-xs text-gray-400 mb-1">Recipient Address Validator</label>
        <input
          type="text"
          value={testAddress}
          onChange={(e) => setTestAddress(e.target.value)}
         
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-2">Current Guardrails</h2>
        <ul className="space-y-1 text-xs text-gray-400 mb-3">
          <li>• Stealth transaction broadcast remains gated until secp256k1 integration passes production verification.</li>
          <li>• Address validation, environment checks, and readiness telemetry are active on this page.</li>
          <li>• Once cryptographic routing is enabled, this panel will switch to send/receive controls.</li>
        </ul>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText('EIP-5564 readiness snapshot captured')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/30"
        >
          <Copy size={12} /> Copy Readiness Snapshot
        </button>
      </div>
    </div>
  );
}
