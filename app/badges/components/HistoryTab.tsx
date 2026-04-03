'use client';

const RECENT_ACTIVITY = [
  { label: 'Marketplace streak maintained', detail: '7 day activity streak preserved', when: 'Today' },
  { label: 'Governance participation logged', detail: 'Proposal vote counted toward seasonal progress', when: '2 days ago' },
  { label: 'Merchant milestone tracked', detail: 'Volume progress synced for commerce badges', when: 'Last week' },
];

export function HistoryTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Progress History</h3>
        <p className="text-gray-400">Recent badge-related events are captured here for auditability and reward review.</p>
      </div>

      <div className="space-y-3">
        {RECENT_ACTIVITY.map((entry) => (
          <div key={entry.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-white font-semibold">{entry.label}</h4>
              <p className="text-sm text-gray-400">{entry.detail}</p>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">{entry.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
