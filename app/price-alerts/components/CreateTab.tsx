'use client';

interface CreateTabProps {
  address?: `0x${string}`;
  symbol: string;
  target: string;
  note: string;
  onSymbolChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export function CreateTab({
  address,
  symbol,
  target,
  note,
  onSymbolChange,
  onTargetChange,
  onNoteChange,
  onCreate,
  onCancel,
}: CreateTabProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white">Create Price Alert</h2>
      <p className="text-sm text-gray-400">Alerts will be associated with {address ?? 'your wallet once connected'}.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="space-y-2 text-sm text-gray-300">
          <span>Symbol</span>
          <input
            type="text"
            value={symbol}
            onChange={(event) => onSymbolChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          <span>Target</span>
          <input
            type="number"
            value={target}
            onChange={(event) => onTargetChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          <span>Note</span>
          <input
            type="text"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
        >
          Create Alert
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
