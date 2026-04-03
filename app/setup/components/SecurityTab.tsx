'use client';

const SECURITY_CHECKLIST = [
  'Add at least two guardians before storing meaningful balances in your vault.',
  'Keep your recovery phrase offline and avoid reusing it across wallets or devices.',
  'Enable wallet notifications so unusual approvals or transfers are caught quickly.',
];

const EMERGENCY_ACTIONS = [
  'Pause activity and rotate devices if your wallet session appears compromised.',
  'Use the recovery flow early rather than waiting for a full account lockout.',
];

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Security Hardening</h3>
        <p className="text-gray-400">
          Lock in the basics before using VFIDE for higher-value payments, vault storage, or recovery workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h4 className="mb-3 font-semibold text-white">Recommended checklist</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            {SECURITY_CHECKLIST.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h4 className="mb-3 font-semibold text-white">Emergency response</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            {EMERGENCY_ACTIONS.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
