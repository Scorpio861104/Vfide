'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original docs page

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="security"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    {/* Security Architecture */}
    <div className="text-center mb-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
    <Shield className="w-8 h-8 text-white" />
    </div>
    <h2 className="text-2xl font-bold text-zinc-100 mb-2">4-Layer Security Architecture</h2>
    <p className="text-zinc-400">Emergency Breaker → Guardian Lock → Quarantine → Global Risk</p>
    </div>

    {/* Security Layers */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
    {securityLayers.map((layer) => (
    <div key={layer.num} className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 text-center">
    <div
    className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center border-2`}
    style={{
    backgroundColor: `${layer.color === "red" ? "#dc2626" : layer.color === "orange" ? "#ea580c" : layer.color === "yellow" ? "#ca8a04" : "#16a34a"}20`,
    borderColor: layer.color === "red" ? "#dc2626" : layer.color === "orange" ? "#ea580c" : layer.color === "yellow" ? "#ca8a04" : "#16a34a"
    }}
    >
    <span className="text-xl font-bold" style={{
    color: layer.color === "red" ? "#dc2626" : layer.color === "orange" ? "#ea580c" : layer.color === "yellow" ? "#ca8a04" : "#16a34a"
    }}>{layer.num}</span>
    </div>
    <div className="font-bold text-zinc-100 mb-2">{layer.name}</div>
    <div className="text-xs text-zinc-400">{layer.desc}</div>
    </div>
    ))}
    </div>

    {/* Key Security Features */}
    <div className="bg-zinc-800 rounded-xl p-8 border border-zinc-700">
    <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
    <Lock className="w-5 h-5 text-cyan-400" />
    Key Security Features
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-4">
    <div className="flex gap-3">
    <div className="w-8 h-8 bg-cyan-400/20 rounded-lg flex items-center justify-center shrink-0">
    <Shield className="w-4 h-4 text-cyan-400" />
    </div>
    <div>
    <div className="font-medium text-zinc-100">Non-Custodial Vaults</div>
    <div className="text-sm text-zinc-400">Only YOU control your funds. VFIDE cannot access vaults.</div>
    </div>
    </div>
    <div className="flex gap-3">
    <div className="w-8 h-8 bg-emerald-400/20 rounded-lg flex items-center justify-center shrink-0">
    <Users className="w-4 h-4 text-emerald-400" />
    </div>
    <div>
    <div className="font-medium text-zinc-100">Guardian Recovery</div>
    <div className="text-sm text-zinc-400">Add trusted guardians for wallet recovery. M-of-N approval required.</div>
    </div>
    </div>
    </div>
    <div className="space-y-4">
    <div className="flex gap-3">
    <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center shrink-0">
    <Lock className="w-4 h-4 text-amber-400" />
    </div>
    <div>
    <div className="font-medium text-zinc-100">User-Controlled Freeze</div>
    <div className="text-sm text-zinc-400">Freeze your vault like freezing a credit card. Instant protection.</div>
    </div>
    </div>
    <div className="flex gap-3">
    <div className="w-8 h-8 bg-violet-400/20 rounded-lg flex items-center justify-center shrink-0">
    <Zap className="w-4 h-4 text-violet-400" />
    </div>
    <div>
    <div className="font-medium text-zinc-100">Abnormal Transaction Detection</div>
    <div className="text-sm text-zinc-400">Large transfers require your explicit approval.</div>
    </div>
    </div>
    </div>
    </div>
    </div>

    <div className="bg-zinc-800 rounded-xl p-8 border border-zinc-700 mt-8">
    <h3 className="text-xl font-bold text-zinc-100 mb-4">Enduring Documents</h3>
    <p className="text-zinc-400 mb-6">
    Document vaults use immutable hashes, version locks, and DAO-governed retention policies so
    regulatory records remain durable even as wallets rotate.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-400">
    <div className="bg-zinc-900/60 rounded-lg border border-zinc-700 px-4 py-3">
    Immutable seal + timestamp for every submission.
    </div>
    <div className="bg-zinc-900/60 rounded-lg border border-zinc-700 px-4 py-3">
    Retention windows enforced by DAO + Seer oversight.
    </div>
    <div className="bg-zinc-900/60 rounded-lg border border-zinc-700 px-4 py-3">
    Access revocation and audit trails for every view.
    </div>
    </div>
    </div>

    {/* Link to full security page */}
    <div className="text-center mt-8">
    <Link
    href="/vault"
    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-400/20 text-cyan-400 rounded-xl hover:bg-cyan-400/30 transition-colors"
    >
    <Shield className="w-5 h-5" />
    Manage Your Vault Security
    </Link>
    </div>
    </motion.div>
    </div>
  );
}
