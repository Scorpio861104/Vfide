'use client';

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function HistoryTab({
  history,
}: {
  history: Array<{
    id: string;
    label: string;
    recipient: string;
    amount: string;
    status: 'active' | 'paused' | 'cancelled';
    updatedAt: string;
    source: 'local' | 'onchain-ready';
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-3">Payment History</h2>
        {history.length === 0 ? (
          <p className="text-gray-400">
            Your completed and skipped subscription payments will appear here once billing starts.
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-white">{entry.label}</div>
                    <div className="text-sm text-gray-300">{entry.amount} VFIDE → {entry.recipient}</div>
                    <div className="text-xs text-gray-500">Updated {formatDate(entry.updatedAt)}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white capitalize">{entry.status}</div>
                    <div className="text-cyan-300">{entry.source === 'onchain-ready' ? 'On-chain ready' : 'Backend schedule'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
