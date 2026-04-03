'use client';

import Link from 'next/link';

const VAULT_STEPS = [
  'Create the vault and confirm ownership from your connected wallet.',
  'Set guardians and recovery timing before depositing meaningful balances.',
  'Test a small deposit and withdrawal to confirm the flow on your current network.',
];

export function VaultTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Vault Readiness</h3>
        <p className="text-gray-400">
          Use the vault checklist below to move from initial setup into a safer production-ready custody posture.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="space-y-2 text-sm text-gray-300">
          {VAULT_STEPS.map((step) => (
            <li key={step}>• {step}</li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/vault" className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-zinc-950">
            Open Vault Dashboard
          </Link>
          <Link href="/guardians" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">
            Manage Guardians
          </Link>
        </div>
      </div>
    </div>
  );
}
