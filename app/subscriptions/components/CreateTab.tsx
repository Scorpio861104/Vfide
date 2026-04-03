'use client';

export function CreateTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Create New Subscription</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-300">
            Recipient
            <input
              aria-label="Recipient"
              defaultValue="0xmerchant"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-gray-300">
            Amount
            <input
              aria-label="Amount"
              defaultValue="50 VFIDE"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
        </div>
        <button className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-zinc-950">
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
