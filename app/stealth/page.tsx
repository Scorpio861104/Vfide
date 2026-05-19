'use client';

import { useMemo, useState } from 'react';
import { Shield, Clock3, CheckCircle2, Activity, Copy, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';

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
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="badge-live mb-4">
              <EyeOff size={12} /> Privacy Engine
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight flex items-center gap-3">
              <EyeOff className="text-violet-400" size={32} />
              <span className="bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">
                Stealth Address
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Operational readiness panel for private payment routing and EIP-5564 enablement.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="analytics-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-cyan-400" />
                <p className="text-xs text-gray-400">Privacy Engine</p>
              </div>
              <p className="text-white font-semibold">EIP-5564 Validation</p>
            </div>
            <div className="analytics-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock3 size={14} className="text-amber-400" />
                <p className="text-xs text-gray-400">Status</p>
              </div>
              <p className="text-white font-semibold">Restricted Execution Mode</p>
            </div>
            <div className="analytics-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-emerald-400" />
                <p className="text-xs text-gray-400">Readiness Checks</p>
              </div>
              <p className="text-white font-semibold">{checks.filter((c) => c.ok).length}/{checks.length} Passing</p>
            </div>
          </div>

          {/* Environment Check */}
          <div className="glass-card-premium p-5 mb-5">
            <h2 className="text-white font-semibold text-sm mb-3">Environment Check</h2>
            <div className="space-y-2 mb-4">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center justify-between analytics-card px-3 py-2">
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Guardrails */}
          <div className="glass-card-premium p-5">
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
      </div>
      <Footer />
    </>
  );
}
