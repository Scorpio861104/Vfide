'use client';

const STREAM_FEATURES = [
  {
    title: 'Stable payout planning',
    detail: 'Choose a predictable amount and memo so contributors know exactly what each stream covers.',
  },
  {
    title: 'Non-custodial control',
    detail: 'Keep settlement rights in your own wallet while still automating recurring team payments.',
  },
  {
    title: 'Auditable history',
    detail: 'Top-ups, pauses, and withdrawals appear in the payroll trail for downstream reconciliation.',
  },
];

export function CreateTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Create Stream</h3>
        <p className="text-gray-400">
          Draft a recurring payroll stream for a teammate, contractor, or service provider before submitting the onchain transaction.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-300">
              Recipient wallet or ENS
              <input
                type="text"
                placeholder="0x... or alex.eth"
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-gray-500"
              />
            </label>
            <label className="text-sm text-gray-300">
              Amount per interval
              <input
                type="number"
                placeholder="1500"
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-gray-500"
              />
            </label>
            <label className="text-sm text-gray-300">
              Start date
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              Payment asset
              <select className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white">
                <option>USDC</option>
                <option>DAI</option>
                <option>VFIDE</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm text-gray-300">
            Internal memo
            <textarea
              rows={3}
              placeholder="Example: monthly design retainer"
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-gray-500"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-zinc-950">
              Create Stream
            </button>
            <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">
              Review Approvals
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {STREAM_FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/3 p-5">
              <h4 className="mb-2 font-semibold text-white">{feature.title}</h4>
              <p className="text-sm text-gray-400">{feature.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
