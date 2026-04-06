'use client';

export function CreateTab({
  isConnected,
  draft,
  contractsReady,
  onFieldChange,
  onCreate,
}: {
  isConnected: boolean;
  contractsReady: boolean;
  draft: {
    recipient: string;
    amount: string;
    label: string;
    interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  onFieldChange: (field: 'recipient' | 'amount' | 'label' | 'interval', value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Create New Subscription</h2>
        <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
          {contractsReady
            ? 'This environment is ready for wallet-backed approvals once you confirm the recurring payment plan.'
            : 'Create and preview the recurring schedule now; the plan will be stored in the VFIDE backend until the subscription contracts are configured.'}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-300">
            Recipient
            <input
              aria-label="Recipient"
              value={draft.recipient}
              onChange={(event) => onFieldChange('recipient', event.target.value)}
              placeholder="0xmerchant or payroll wallet"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-gray-300">
            Amount
            <input
              aria-label="Amount"
              value={draft.amount}
              onChange={(event) => onFieldChange('amount', event.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="50"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-gray-300 md:col-span-2">
            Label
            <input
              aria-label="Label"
              value={draft.label}
              onChange={(event) => onFieldChange('label', event.target.value)}
              placeholder="Team retainer"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-gray-300 md:col-span-2">
            Billing Interval
            <select
              aria-label="Billing Interval"
              value={draft.interval}
              onChange={(event) => onFieldChange('interval', event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={onCreate}
          disabled={!isConnected || !draft.recipient.trim() || !draft.amount.trim()}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create Subscription
        </button>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">How Subscriptions Work</h3>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="font-semibold text-white">Set &amp; Forget</p>
            <p className="mt-2 text-gray-400">Schedule recurring payments once and let the vault handle the rest.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="font-semibold text-white">Guardian Safe</p>
            <p className="mt-2 text-gray-400">Large or suspicious subscription changes can still require your vault approvals.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="font-semibold text-white">Stop Anytime</p>
            <p className="mt-2 text-gray-400">Pause or cancel recurring charges without leaving the dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
