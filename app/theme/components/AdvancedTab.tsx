'use client';

const ADVANCED_NOTES = [
  'Keep contrast ratios strong enough for wallets, balances, and transaction confirmations.',
  'Test themes in both desktop and mobile layouts before rolling them out broadly.',
  'Export or document custom settings so production branding can be recreated consistently.',
];

export function AdvancedTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Advanced Notes</h3>
        <p className="text-gray-400">These guardrails help keep theme experimentation polished and accessible.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="space-y-2 text-sm text-gray-300">
          {ADVANCED_NOTES.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
