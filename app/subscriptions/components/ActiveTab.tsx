'use client';

type SubscriptionItem = {
  id: string;
  recipient: string;
  label: string;
  amount: string;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'paused';
  nextPayment: string | null;
  updatedAt: string;
  source: 'local' | 'onchain-ready';
  note: string;
};

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ActiveTab({
  isConnected,
  subscriptions,
  contractsReady,
  onTogglePause,
  onCancel,
}: {
  isConnected: boolean;
  subscriptions: SubscriptionItem[];
  contractsReady: boolean;
  onTogglePause: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-3">Active Subscriptions</h2>
        {!isConnected ? (
          <p className="text-gray-300">
            Connect your wallet to view and manage your subscriptions.
          </p>
        ) : subscriptions.length === 0 ? (
          <>
            <p className="text-white font-semibold mb-2">No Active Subscriptions</p>
            <p className="text-gray-400">
              Create a recurring payment for payroll, rent, retainers, or software renewals in a few clicks.
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Running</div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {subscriptions.filter((subscription) => subscription.status === 'active').length}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-300">Paused</div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {subscriptions.filter((subscription) => subscription.status === 'paused').length}
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Execution mode</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {contractsReady ? 'Wallet-backed automation ready' : 'Local scheduling mode'}
                </div>
              </div>
            </div>

            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-white">{subscription.label}</div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        subscription.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}>
                        {subscription.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-300">{subscription.amount} VFIDE → {subscription.recipient}</div>
                    <div className="mt-1 text-xs text-gray-400">
                      {subscription.interval} cadence · next payment {formatDate(subscription.nextPayment)}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">{subscription.note}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onTogglePause(subscription.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white"
                    >
                      {subscription.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancel(subscription.id)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200"
                    >
                      Cancel
                    </button>
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
